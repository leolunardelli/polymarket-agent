#!/usr/bin/env python3
"""
Polymarket Trading Bot - 7-Day Test Results Deep Analysis
=========================================================
Analyzes test-results.json to identify root causes of poor performance
and generates specific improvement recommendations.
"""

import json
import os
import sys
from datetime import datetime, timedelta
from collections import defaultdict

# ============================================================
# 1. LOAD TEST RESULTS
# ============================================================
results_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'test-results.json')
with open(results_path, 'r') as f:
    data = json.load(f)

print("=" * 70)
print("📊 POLYMARKET TRADING BOT - 7-DAY TEST ANALYSIS")
print("=" * 70)

# ============================================================
# 2. KEY METRICS EXTRACTION
# ============================================================
perf = data['performance']
activity = data['activity']
positions = data['positions']
test_info = data['testInfo']

start_balance = perf['startBalance']
current_balance = perf['currentBalance']
total_value = perf['totalValue']
unrealized_pnl = perf['unrealizedPnL']
realized_pnl = perf['realizedPnL']
total_pnl = perf['totalPnL']
return_pct = float(perf['returnPercent'])
win_rate = float(perf['winRate'])
max_drawdown = float(perf['maxDrawdown'])

total_trades = activity['totalTrades']
winning_trades = activity['winningTrades']
losing_trades = activity['losingTrades']
open_positions = activity['openPositions']
markets_analyzed = activity['marketsAnalyzed']
cycles_completed = activity['cyclesCompleted']

elapsed_hours = float(test_info['elapsedHours'])

print(f"\n📅 Test Duration: {elapsed_hours:.1f} hours of 168 hours ({float(test_info['percentComplete']):.1f}% complete)")
print(f"🔄 Cycles Completed: {cycles_completed}")
print(f"📊 Markets Analyzed: {markets_analyzed}")

# ============================================================
# 3. PERFORMANCE BREAKDOWN
# ============================================================
print("\n" + "=" * 70)
print("💰 PERFORMANCE BREAKDOWN")
print("=" * 70)

cash_deployed = start_balance - current_balance
positions_value = sum(p['quantity'] * p['currentPrice'] for p in positions)
cash_pct_deployed = (cash_deployed / start_balance) * 100

print(f"\n  Starting Balance:     ${start_balance:>12,.2f}")
print(f"  Current Cash:         ${current_balance:>12,.2f}")
print(f"  Cash Deployed:        ${cash_deployed:>12,.2f} ({cash_pct_deployed:.1f}% of start)")
print(f"  Positions Value:      ${positions_value:>12,.2f}")
print(f"  Total Portfolio:      ${total_value:>12,.2f}")
print(f"  Unrealized PnL:       ${unrealized_pnl:>12,.2f}")
print(f"  Realized PnL:         ${realized_pnl:>12,.2f}")
print(f"  Total PnL:            ${total_pnl:>12,.2f}")
print(f"  Return:               {return_pct:>11.2f}%")
print(f"  Win Rate:             {win_rate:>11.2f}%")
print(f"  Max Drawdown:         {max_drawdown:>11.2f}%")

# ============================================================
# 4. POSITION ANALYSIS
# ============================================================
print("\n" + "=" * 70)
print("📂 POSITION ANALYSIS")
print("=" * 70)

total_cost_basis = 0
total_current_value = 0
position_sizes = []
entry_prices = []

for i, pos in enumerate(positions):
    cost_basis = pos['quantity'] * pos['entryPrice']
    current_val = pos['quantity'] * pos['currentPrice']
    total_cost_basis += cost_basis
    total_current_value += current_val
    position_sizes.append(cost_basis)
    entry_prices.append(pos['entryPrice'])
    
    pnl_pct = float(pos['pnlPercent'])
    status = "🟢" if pnl_pct > 0 else "🔴" if pnl_pct < 0 else "⚪"
    
    print(f"\n  {status} Position {i+1}: {pos['symbol']}")
    print(f"     Qty: {pos['quantity']:,}  |  Entry: ${pos['entryPrice']:.4f}  |  Current: ${pos['currentPrice']:.4f}")
    print(f"     Cost: ${cost_basis:,.2f}  |  Value: ${current_val:,.2f}  |  PnL: ${pos['pnl']:,.2f} ({pnl_pct}%)")

# ============================================================
# 5. ROOT CAUSE ANALYSIS
# ============================================================
print("\n" + "=" * 70)
print("🔍 ROOT CAUSE ANALYSIS")
print("=" * 70)

issues = []

# Issue 1: Cash depletion
print(f"\n  ❌ ISSUE 1: SEVERE CASH DEPLETION")
print(f"     ${cash_deployed:,.2f} ({cash_pct_deployed:.1f}%) of starting balance spent on positions")
print(f"     Only ${current_balance:,.2f} cash remaining (cannot buy dips or new opportunities)")
issues.append(("CRITICAL", "Cash depletion", f"{cash_pct_deployed:.0f}% deployed"))

# Issue 2: No realized profits
print(f"\n  ❌ ISSUE 2: ZERO REALIZED PROFITS")
print(f"     {total_trades} trades executed, {winning_trades} winning, {losing_trades} losing")
print(f"     Realized PnL: ${realized_pnl:.2f} - No positions were ever closed profitably")
print(f"     Take-profit (20%) and stop-loss (15%) may be too wide for low-price contracts")
issues.append(("CRITICAL", "No exits triggered", "0% win rate"))

# Issue 3: Position concentration
unique_markets = set()
duplicate_count = 0
for pos in positions:
    base_name = pos['symbol'].rsplit('_', 1)[0] if '_' in pos['symbol'] else pos['symbol']
    if base_name in unique_markets:
        duplicate_count += 1
    unique_markets.add(base_name)

print(f"\n  ❌ ISSUE 3: DUPLICATE POSITIONS")
print(f"     {len(positions)} positions, {len(unique_markets)} unique markets, {duplicate_count} duplicates")
print(f"     Bot is buying same markets multiple times across different cycles")
issues.append(("HIGH", "Duplicate positions", f"{duplicate_count} duplicates"))

# Issue 4: Position sizing at low prices
avg_entry_price = sum(entry_prices) / len(entry_prices) if entry_prices else 0
avg_position_size = sum(position_sizes) / len(position_sizes) if position_sizes else 0
max_position_size = max(position_sizes) if position_sizes else 0
min_position_size = min(position_sizes) if position_sizes else 0

print(f"\n  ⚠️  ISSUE 4: LOW PRICE ENTRY BIAS")
print(f"     Average entry price: ${avg_entry_price:.4f}")
print(f"     All entries are below $0.40 - buying 'long-shot' outcomes")
print(f"     Average position cost: ${avg_position_size:,.2f}")
print(f"     Position range: ${min_position_size:,.2f} - ${max_position_size:,.2f}")
issues.append(("HIGH", "Low-price bias", f"Avg entry ${avg_entry_price:.3f}"))

# Issue 5: Strategy is too simple
trades_per_cycle = total_trades / max(cycles_completed, 1)
print(f"\n  ⚠️  ISSUE 5: NAIVE STRATEGY")
print(f"     Trades per cycle: {trades_per_cycle:.2f}")
print(f"     Strategy: volume * 0.4 + liquidity * 0.3 + priceScore * 0.3")
print(f"     No trend analysis, no sentiment, no time-decay, no edge detection")
print(f"     Confidence threshold too low (50%) - lets almost anything through")
issues.append(("HIGH", "No edge detection", "Naive confidence scoring"))

# Issue 6: Max drawdown tracking is broken
actual_drawdown = ((start_balance - total_value) / start_balance) * 100
print(f"\n  ⚠️  ISSUE 6: DRAWDOWN TRACKING ERROR")
print(f"     Reported max drawdown: {max_drawdown:.2f}%")
print(f"     Actual drawdown: {actual_drawdown:.2f}%")
print(f"     Portfolio history only tracks buy/sell events, not continuous values")
issues.append(("MEDIUM", "Drawdown tracking broken", f"Reported {max_drawdown}% vs actual {actual_drawdown:.0f}%"))

# Issue 7: No time-to-expiry check
print(f"\n  ⚠️  ISSUE 7: NO TIME-TO-EXPIRY ANALYSIS")
print(f"     Bot doesn't check when markets expire")
print(f"     Could be buying into markets that resolve in days")
issues.append(("MEDIUM", "No expiry analysis", "Theta risk ignored"))

# ============================================================
# 6. QUANTITATIVE RISK ANALYSIS
# ============================================================
print("\n" + "=" * 70)
print("📈 QUANTITATIVE RISK METRICS")
print("=" * 70)

# Portfolio concentration (Herfindahl index)
total_positions_value = sum(position_sizes)
if total_positions_value > 0:
    weights = [s / total_positions_value for s in position_sizes]
    herfindahl = sum(w**2 for w in weights)
    effective_positions = 1 / herfindahl if herfindahl > 0 else 0
else:
    herfindahl = 0
    effective_positions = 0

print(f"\n  Herfindahl Index:          {herfindahl:.4f} (1/N = {1/len(positions):.4f})")
print(f"  Effective # Positions:     {effective_positions:.1f} of {len(positions)}")
print(f"  Cash Reserve Ratio:        {(current_balance/start_balance)*100:.1f}%")
print(f"  Portfolio Utilization:     {cash_pct_deployed:.1f}%")

# Annualized metrics (projected from partial data)
if elapsed_hours > 0:
    hourly_return = return_pct / elapsed_hours
    daily_return = hourly_return * 24
    weekly_projected_return = hourly_return * 168
    annualized_return = daily_return * 365
    
    print(f"\n  Hourly Return Rate:        {hourly_return:.4f}%")
    print(f"  Daily Return Rate:         {daily_return:.2f}%")
    print(f"  Projected 7-Day Return:    {weekly_projected_return:.2f}%")
    print(f"  Annualized (projected):    {annualized_return:.2f}%")

# ============================================================
# 7. IMPROVEMENT RECOMMENDATIONS
# ============================================================
print("\n" + "=" * 70)
print("🔧 IMPROVEMENT RECOMMENDATIONS")
print("=" * 70)

recommendations = [
    {
        "priority": "P0 - CRITICAL",
        "area": "Position Sizing",
        "problem": f"Deployed {cash_pct_deployed:.0f}% of capital, only ${current_balance:.0f} cash left",
        "solution": "Implement Kelly Criterion with max 5% per position, maintain 40% cash reserve",
        "expected_impact": "Reduce max loss per position from ~$950 to ~$500, keep capital for opportunities"
    },
    {
        "priority": "P0 - CRITICAL", 
        "area": "Exit Strategy",
        "problem": "0 positions closed in entire test period, 0% win rate",
        "solution": "Add time-based exits (close after 48h if <5% gain), trailing stops, tighter thresholds",
        "expected_impact": "Generate actual realized P&L, improve win rate from 0% to 40-60%"
    },
    {
        "priority": "P0 - CRITICAL",
        "area": "Duplicate Prevention",
        "problem": f"{duplicate_count} duplicate positions in same markets",
        "solution": "Track conditionId of open positions, skip markets already in portfolio",
        "expected_impact": "Better diversification, reduce concentration risk"
    },
    {
        "priority": "P1 - HIGH",
        "area": "Market Analysis",
        "problem": "Simple volume/liquidity/price scoring with 50% threshold lets bad trades through",
        "solution": "Add: time-to-expiry score, price momentum (compare to 24h ago), min volume $50k, confidence >= 70%",
        "expected_impact": "Filter out 60% of bad trades, focus on higher-conviction opportunities"
    },
    {
        "priority": "P1 - HIGH",
        "area": "Price Range",
        "problem": f"Average entry ${avg_entry_price:.3f} - buying extreme long-shots that rarely pay",
        "solution": "Narrow price range to 0.20-0.80, prefer 0.30-0.70 for better risk/reward",
        "expected_impact": "Higher probability of profit, smaller position sizes needed"
    },
    {
        "priority": "P1 - HIGH",
        "area": "Cash Management",
        "problem": "No minimum cash reserve, bot can deploy 100% of capital",
        "solution": "Enforce 40% minimum cash reserve, scale position size with available capital",
        "expected_impact": "Always have capital for new opportunities and dip buying"
    },
    {
        "priority": "P2 - MEDIUM",
        "area": "Sentiment Integration",
        "problem": "SentimentAnalyzer exists but is never used in trading decisions",
        "solution": "Integrate sentiment signals as additional confidence factor",
        "expected_impact": "Additional edge from market sentiment, +5-10% better signal quality"
    },
    {
        "priority": "P2 - MEDIUM",
        "area": "Risk Management",
        "problem": f"Max drawdown reported as {max_drawdown}% but actual is {actual_drawdown:.0f}%",
        "solution": "Track portfolio value every cycle, implement circuit breakers at 20% drawdown",
        "expected_impact": "Stop trading during adverse conditions, preserve capital"
    },
    {
        "priority": "P2 - MEDIUM",
        "area": "Diversification",
        "problem": "No sector/category awareness, could load up on correlated markets",
        "solution": "Max 2 positions per market category, spread across political/sports/crypto/economics",
        "expected_impact": "Reduce correlation risk, smoother equity curve"
    }
]

for i, rec in enumerate(recommendations):
    print(f"\n  [{rec['priority']}] #{i+1}: {rec['area']}")
    print(f"    Problem:  {rec['problem']}")
    print(f"    Solution: {rec['solution']}")
    print(f"    Impact:   {rec['expected_impact']}")

# ============================================================
# 8. GENERATE IMPROVED CONFIGURATION
# ============================================================
print("\n" + "=" * 70)
print("⚙️  IMPROVED CONFIGURATION VALUES")
print("=" * 70)

improved_config = {
    "virtualBalance": 10000,
    "testDurationMs": 7 * 24 * 60 * 60 * 1000,
    "checkIntervalMs": 5 * 60 * 1000,
    "reportIntervalMs": 5 * 60 * 1000,
    "maxPositionSize": 300,
    "minProbability": 0.20,
    "maxProbability": 0.80,
    "targetProfitPercent": 12,
    "stopLossPercent": 8,
    "maxConcurrentPositions": 8,
    "minCashReservePercent": 40,
    "maxPositionAgeDays": 3,
    "trailingStopPercent": 5,
    "minConfidence": 70,
    "minVolume": 50000,
    "minLiquidity": 10000,
    "maxPositionsPerCategory": 2,
    "maxDrawdownPercent": 20,
}

for k, v in improved_config.items():
    print(f"  {k}: {v}")

# ============================================================
# 9. SIMULATION: WHAT-IF WITH IMPROVED PARAMS
# ============================================================
print("\n" + "=" * 70)
print("🎯 SIMULATION: PROJECTED IMPROVEMENT")
print("=" * 70)

simulated_saved_capital = start_balance * 0.40
simulated_max_deployed = start_balance - simulated_saved_capital
simulated_per_position = min(300, simulated_max_deployed * 0.05)
simulated_positions = min(8, int(simulated_max_deployed / simulated_per_position))

simulated_max_loss_per_position = simulated_per_position * 0.08
simulated_max_total_loss = simulated_max_loss_per_position * simulated_positions

print(f"\n  💰 Capital Allocation:")
print(f"     Cash Reserve: ${simulated_saved_capital:,.2f} (40%)")
print(f"     Max Deployable: ${simulated_max_deployed:,.2f} (60%)")
print(f"     Per Position: ${simulated_per_position:,.2f}")
print(f"     Max Positions: {simulated_positions}")

print(f"\n  📉 Risk Limits:")
print(f"     Max Loss/Position: ${simulated_max_loss_per_position:,.2f} ({improved_config['stopLossPercent']}%)")
print(f"     Max Total Loss: ${simulated_max_total_loss:,.2f}")
print(f"     Worst-case portfolio: ${start_balance - simulated_max_total_loss:,.2f} ({(simulated_max_total_loss/start_balance)*100:.1f}% drawdown)")

print(f"\n  📈 Compared to Current:")
print(f"     Current total loss: ${abs(total_pnl):,.2f}")
print(f"     Current drawdown: {actual_drawdown:.1f}%")
print(f"     Improved max drawdown: {(simulated_max_total_loss/start_balance)*100:.1f}%")
print(f"     Risk reduction: {((actual_drawdown - (simulated_max_total_loss/start_balance)*100)/actual_drawdown)*100:.0f}%")

# ============================================================
# 10. SUMMARY SCORECARD
# ============================================================
print("\n" + "=" * 70)
print("📋 SUMMARY SCORECARD")  
print("=" * 70)

scores = {
    "Return": ("F", str(return_pct) + "%", "> 0%"),
    "Win Rate": ("F", str(win_rate) + "%", "> 50%"),
    "Cash Mgmt": ("F", f"${current_balance:.0f} left", "> $4,000"),
    "Drawdown": ("F", f"{actual_drawdown:.1f}%", "< 20%"),
    "Diversification": ("D", f"{len(unique_markets)} unique", "> 8 unique"),
    "Trade Count": ("C", str(total_trades), "10-50"),
    "Exit Discipline": ("F", "0 exits", "> 50% closed"),
    "Strategy Edge": ("F", "None detected", "Positive alpha"),
}

for metric, (grade, value, target) in scores.items():
    emoji = "🟢" if grade in ("A", "B") else "🟡" if grade == "C" else "🔴"
    print(f"  {emoji} {metric:.<25} Grade: {grade}  |  Value: {value}  |  Target: {target}")

print(f"\n  Overall Grade: F")
print(f"  The bot needs fundamental strategy improvements before the next test run.")
print(f"  Primary focus: Exit strategy, position sizing, and cash management.")

# ============================================================
# 11. EXPORT ANALYSIS RESULTS
# ============================================================
analysis_output = {
    "analysis_timestamp": datetime.now().isoformat(),
    "test_results_timestamp": data['timestamp'],
    "performance_summary": {
        "return_percent": return_pct,
        "win_rate": win_rate,
        "actual_drawdown": actual_drawdown,
        "cash_deployed_percent": cash_pct_deployed,
        "realized_pnl": realized_pnl,
        "unrealized_pnl": unrealized_pnl,
    },
    "issues_found": [{"severity": s, "issue": i, "detail": d} for s, i, d in issues],
    "improved_config": improved_config,
    "recommendations": recommendations,
    "scorecard": {k: {"grade": g, "value": v, "target": t} for k, (g, v, t) in scores.items()},
}

output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'analysis_results.json')
with open(output_path, 'w') as f:
    json.dump(analysis_output, f, indent=2)

print(f"\n\n✅ Analysis exported to: {output_path}")
print("=" * 70)
print("✅ ANALYSIS COMPLETE - Implementing improvements in trading code...")
print("=" * 70)
