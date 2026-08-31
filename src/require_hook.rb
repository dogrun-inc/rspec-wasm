require "js"
require "json"

# Track loaded feature paths to prevent redundant loading or infinite recursion loops
$LOADED_FEATURES_SET ||= {}

# = CustomRequireHook
#
# +CustomRequireHook+ intercepts Ruby's core file-loading mechanisms (+require+, +require_relative+, +load+)
# inside the +ruby.wasm+ Virtual Machine environment.
#
# When Ruby code inside WASM executes +require+ or +load+, this module intercepts the call and
# delegates file lookup to Node.js filesystem via JS interop (+JS.global.call(:resolveRubyModule, ...)+).
# Found files are evaluated directly in +TOPLEVEL_BINDING+, and pending +autoload+ triggers are cleared.
#
module CustomRequireHook
  # Clears any pending +autoload+ constant definitions matching the given feature path.
  #
  # In CRuby, evaluating source code via +eval+ does not automatically clear internal +autoload+
  # constant triggers. This method searches all loaded modules and removes matching +autoload+
  # constants prior to evaluation to avoid +NameError+ or autoload recursion issues.
  #
  # == Parameters:
  # [feature_name]
  #   Feature name or file path string (e.g., +"rspec/core/profiler"+ or +"lib/calculator.rb"+).
  #
  def clear_autoload_for(feature_name)
    target = feature_name.sub(/\.rb$/, "")
    ObjectSpace.each_object(Module) do |mod|
      mod.constants(false).each do |const_name|
        auto_path = mod.autoload?(const_name)
        if auto_path
          auto_clean = auto_path.to_s.sub(/\.rb$/, "")
          if target.end_with?(auto_clean) || auto_clean.end_with?(target)
            begin
              mod.send(:remove_const, const_name)
            rescue NameError
            end
          end
        end
      end
    end
  rescue => e
  end

  # Intercepts +Kernel#load+ calls.
  #
  # Delegates file resolution to Node.js FS via +resolveRubyModule+. If resolved, clears
  # matching autoload triggers and evaluates the source code.
  #
  # == Parameters:
  # [name]
  #   File path or feature name to load.
  # [wrap]
  #   Optional module wrapping flag (passed to super if fallback occurs).
  #
  # == Returns:
  # +true+ if the file was resolved and evaluated from Node.js FS, or fallback result.
  #
  def load(name, wrap = false)
    feature_name = name.to_s
    res = JS.global.call(:resolveRubyModule, feature_name).to_s
    if !res.empty? && res != "null" && res != "undefined"
      data = JSON.parse(res)
      ruby_code = data["code"]
      file_path = data["file_path"]

      clear_autoload_for(feature_name)
      clear_autoload_for(file_path)

      eval(ruby_code, TOPLEVEL_BINDING, file_path)
      return true
    end

    super(name, wrap)
  rescue LoadError => e
    if !feature_name.end_with?(".rb")
      rb_feature = "#{feature_name}.rb"
      res_rb = JS.global.call(:resolveRubyModule, rb_feature).to_s
      if !res_rb.empty? && res_rb != "null" && res_rb != "undefined"
        data = JSON.parse(res_rb)
        ruby_code = data["code"]
        file_path = data["file_path"]

        clear_autoload_for(feature_name)
        clear_autoload_for(rb_feature)
        clear_autoload_for(file_path)

        eval(ruby_code, TOPLEVEL_BINDING, file_path)
        return true
      end
    end
    raise e
  end

  # Intercepts +Kernel#require_relative+ calls.
  #
  # Resolves relative feature paths using the caller's location (+caller_locations+) and delegates
  # execution to +require+.
  #
  # == Parameters:
  # [relative_feature]
  #   Relative feature path string passed to +require_relative+.
  #
  def require_relative(relative_feature)
    loc = caller_locations(1, 1).first
    base_file = loc.absolute_path || loc.path
    if base_file.nil? || base_file.empty?
      raise LoadError, "cannot infer basepath for require_relative"
    end
    caller_dir = File.dirname(base_file)
    abs_feature = File.expand_path(relative_feature.to_s, caller_dir)
    require(abs_feature)
  end

  # Intercepts +Kernel#require+ calls.
  #
  # Delegates feature lookup to Node.js FS via +resolveRubyModule+.
  # If found, registers the feature in +$LOADED_FEATURES+, clears autoload triggers, and evaluates
  # the code in +TOPLEVEL_BINDING+.
  #
  # == Parameters:
  # [name]
  #   Feature name or path requested (e.g., +"calculator"+, +"rspec/core"+).
  #
  # == Returns:
  # +true+ if newly required, +false+ if already loaded.
  #
  def require(name)
    feature_name = name.to_s
    return false if $LOADED_FEATURES_SET[feature_name]

    res = JS.global.call(:resolveRubyModule, feature_name).to_s
    if !res.empty? && res != "null" && res != "undefined"
      data = JSON.parse(res)
      ruby_code = data["code"]
      file_path = data["file_path"]

      $LOADED_FEATURES_SET[feature_name] = true
      $LOADED_FEATURES_SET[file_path] = true
      $LOADED_FEATURES << file_path unless $LOADED_FEATURES.include?(file_path)

      clear_autoload_for(feature_name)
      clear_autoload_for(file_path)

      eval(ruby_code, TOPLEVEL_BINDING, file_path)
      return true
    end

    super(name)
  rescue LoadError => e
    if !feature_name.end_with?(".rb")
      rb_feature = "#{feature_name}.rb"
      if !$LOADED_FEATURES_SET[rb_feature]
        res_rb = JS.global.call(:resolveRubyModule, rb_feature).to_s
        if !res_rb.empty? && res_rb != "null" && res_rb != "undefined"
          data = JSON.parse(res_rb)
          ruby_code = data["code"]
          file_path = data["file_path"]

          $LOADED_FEATURES_SET[feature_name] = true
          $LOADED_FEATURES_SET[rb_feature] = true
          $LOADED_FEATURES_SET[file_path] = true
          $LOADED_FEATURES << file_path unless $LOADED_FEATURES.include?(file_path)

          clear_autoload_for(feature_name)
          clear_autoload_for(rb_feature)
          clear_autoload_for(file_path)

          eval(ruby_code, TOPLEVEL_BINDING, file_path)
          return true
        end
      end
    end
    raise e
  end
end

Kernel.prepend(CustomRequireHook)
