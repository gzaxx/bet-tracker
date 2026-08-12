using BetTracker.ApiService.Data.Entities;
using BetTracker.ApiService.Features.Trades;

namespace BetTracker.Api.Tests;

public sealed class FifoAccountingTests
{
    private static readonly DateTimeOffset First = new(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);
    private readonly FifoAccountingCalculator calculator = new();

    [Fact]
    public void Basic_buy_and_sell_includes_both_commissions()
    {
        var result = calculator.Calculate([
            Trade(1, "MSFT", TradeType.Buy, 10, 100, 5, First),
            Trade(2, "MSFT", TradeType.Sell, 4, 120, 2, First.AddHours(1))
        ]);

        Assert.Equal(76m, result.RealizedGainLoss);
        Assert.Equal(6m, result.OpenPositions["MSFT"]);
    }

    [Fact]
    public void Partial_lot_consumption_preserves_remaining_cost_basis()
    {
        var result = calculator.Calculate([
            Trade(1, "MSFT", TradeType.Buy, 10, 100, 5, First),
            Trade(2, "MSFT", TradeType.Sell, 4, 120, 0, First.AddHours(1)),
            Trade(3, "MSFT", TradeType.Sell, 6, 110, 0, First.AddHours(2))
        ]);
        Assert.Equal(135m, result.RealizedGainLoss);
        Assert.Empty(result.OpenPositions);
    }

    [Fact]
    public void Multiple_lots_are_consumed_in_fifo_order()
    {
        var result = calculator.Calculate([
            Trade(1, "MSFT", TradeType.Buy, 5, 100, 0, First),
            Trade(2, "MSFT", TradeType.Buy, 5, 120, 0, First.AddHours(1)),
            Trade(3, "MSFT", TradeType.Sell, 6, 150, 0, First.AddHours(2))
        ]);

        Assert.Equal(280m, result.RealizedGainLoss);
        Assert.Equal(4m, result.OpenPositions["MSFT"]);
    }

    [Fact]
    public void Same_timestamp_uses_trade_id_as_deterministic_tiebreaker()
    {
        var result = calculator.Calculate([
            Trade(2, "MSFT", TradeType.Sell, 1, 120, 0, First),
            Trade(1, "MSFT", TradeType.Buy, 1, 100, 0, First)
        ]);

        Assert.Equal(20m, result.RealizedGainLoss);
    }

    [Fact]
    public void Oversell_is_rejected()
    {
        Assert.Throws<InvalidTradeSequenceException>(() => calculator.Calculate([
            Trade(1, "MSFT", TradeType.Buy, 1, 100, 0, First),
            Trade(2, "MSFT", TradeType.Sell, 1.01m, 120, 0, First.AddHours(1))
        ]));
    }

    [Fact]
    public void Positions_are_independent_per_ticker()
    {
        var result = calculator.Calculate([
            Trade(1, "MSFT", TradeType.Buy, 2, 100, 0, First),
            Trade(2, "AAPL", TradeType.Buy, 3, 200, 0, First),
            Trade(3, "MSFT", TradeType.Sell, 1, 110, 0, First.AddHours(1))
        ]);

        Assert.Equal(1m, result.OpenPositions["MSFT"]);
        Assert.Equal(3m, result.OpenPositions["AAPL"]);
    }

    private static Trade Trade(int id, string ticker, TradeType tradeType, decimal shares, decimal price, decimal commission, DateTimeOffset executedAt) => new()
    {
        Id = id,
        PortfolioId = 1,
        Ticker = ticker,
        TradeType = tradeType,
        Shares = shares,
        Price = price,
        Commission = commission,
        ExecutedAt = executedAt,
        Currency = "USD"
    };
}
