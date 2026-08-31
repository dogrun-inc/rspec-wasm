require "calculator"

RSpec.describe Calculator do
  describe ".add" do
    it "adds two numbers correctly" do
      expect(Calculator.add(1, 2)).to eq(3)
    end

    it "adds negative numbers correctly" do
      expect(Calculator.add(-1, 5)).to eq(4)
    end
  end
end
