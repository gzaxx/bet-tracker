using BetTracker.ApiService.Data.Entities;

namespace BetTracker.ApiService.Features.Trades;

public sealed record FifoAccountingResult(
    decimal RealizedGainLoss,
    IReadOnlyDictionary<string, decimal> OpenPositions)
{
    public IReadOnlyDictionary<string, decimal> OpenCostBasis { get; init; } =
        new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
}

public sealed class InvalidTradeSequenceException(string message) : Exception(message);

public sealed class FifoAccountingCalculator
{
    public FifoAccountingResult Calculate(IEnumerable<Trade> trades)
    {
        var lotsByTicker = new Dictionary<string, Queue<Lot>>(StringComparer.OrdinalIgnoreCase);
        var realizedGainLoss = 0m;

        foreach (var trade in trades
            .OrderBy(candidate => candidate.ExecutedAt.ToUniversalTime())
            .ThenBy(candidate => candidate.Id))
        {
            var ticker = trade.Ticker.Trim().ToUpperInvariant();
            if (!lotsByTicker.TryGetValue(ticker, out var lots))
            {
                lots = new Queue<Lot>();
                lotsByTicker[ticker] = lots;
            }

            if (trade.TradeType == TradeType.Buy)
            {
                lots.Enqueue(new Lot(trade.Shares, trade.Shares * trade.Price + trade.Commission));
                continue;
            }

            var remainingShares = trade.Shares;
            var costBasis = 0m;
            while (remainingShares > 0m && lots.Count > 0)
            {
                var lot = lots.Peek();
                var consumedShares = Math.Min(remainingShares, lot.RemainingShares);
                var consumedCost = lot.RemainingCost * consumedShares / lot.RemainingShares;
                costBasis += consumedCost;
                lot.RemainingShares -= consumedShares;
                lot.RemainingCost -= consumedCost;
                remainingShares -= consumedShares;
                if (lot.RemainingShares == 0m)
                {
                    lots.Dequeue();
                }
            }

            if (remainingShares > 0m)
            {
                throw new InvalidTradeSequenceException($"Selling {trade.Shares} shares of {ticker} would create a negative position.");
            }

            realizedGainLoss += trade.Shares * trade.Price - trade.Commission - costBasis;
        }

        var positions = lotsByTicker
            .Where(pair => pair.Value.Count > 0)
            .ToDictionary(
                pair => pair.Key,
                pair => pair.Value.Sum(lot => lot.RemainingShares),
                StringComparer.OrdinalIgnoreCase);
        var costBasisByTicker = lotsByTicker
            .Where(pair => pair.Value.Count > 0)
            .ToDictionary(
                pair => pair.Key,
                pair => pair.Value.Sum(lot => lot.RemainingCost),
                StringComparer.OrdinalIgnoreCase);

        return new FifoAccountingResult(realizedGainLoss, positions)
        {
            OpenCostBasis = costBasisByTicker
        };
    }

    private sealed class Lot(decimal remainingShares, decimal remainingCost)
    {
        public decimal RemainingShares { get; set; } = remainingShares;
        public decimal RemainingCost { get; set; } = remainingCost;
    }
}
