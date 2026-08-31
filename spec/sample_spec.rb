require "calculator"

RSpec.describe Calculator do
  describe ".add" do
    it "adds two numbers correctly" do
      expect(Calculator.add(1, 2)).to eq(3)
    end
  end
end
