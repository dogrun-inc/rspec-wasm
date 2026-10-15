require "js"

RSpec.describe "JavaScript promises" do
  it "awaits asynchronous JavaScript work" do
    result = JS.eval(<<~JAVASCRIPT).await
      return new Promise((resolve) => {
        setTimeout(() => resolve(42), 10);
      });
    JAVASCRIPT

    expect(result.to_i).to eq(42)
  end
end