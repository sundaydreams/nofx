package trader

import (
    "fmt"
    "log"
    "math"
    "nofx/market"
    "strconv"
)

// SimTrader 模拟交易器（纸交易），使用实时行情数据，记录账户与持仓状态
type SimTrader struct {
    walletBalance   float64
    availableBalance float64
    isCrossMargin   bool

    // 每个symbol的持仓，仅支持单向模式（BOTH），long/short各一条
    positions map[string]*simPosition

    // 费用设置（与实盘估算一致）
    takerFeeRate float64 // 0.04% = 0.0004
}

type simPosition struct {
    symbol      string
    side        string  // "long" or "short"
    quantity    float64 // 合约数量（币数量）
    entryPrice  float64 // 开仓价格
    leverage    int
    stopLoss    float64
    takeProfit  float64
}

// NewSimTrader 创建模拟交易器
func NewSimTrader(initialBalance float64, isCrossMargin bool) (*SimTrader, error) {
    if initialBalance <= 0 {
        return nil, fmt.Errorf("初始余额必须大于0")
    }
    return &SimTrader{
        walletBalance:    initialBalance,
        availableBalance: initialBalance,
        isCrossMargin:    isCrossMargin,
        positions:        make(map[string]*simPosition),
        takerFeeRate:     0.0004,
    }, nil
}

// GetBalance 获取账户余额（钱包余额、未实现盈亏、可用余额）
func (t *SimTrader) GetBalance() (map[string]interface{}, error) {
    unrealized := 0.0
    marginUsed := 0.0
    for _, p := range t.positions {
        md, err := market.Get(p.symbol)
        if err != nil {
            continue
        }
        current := md.CurrentPrice
        // USDT本位合约盈亏（不考虑杠杆影响盈亏，仅影响保证金）
        pnl := 0.0
        if p.side == "long" {
            pnl = p.quantity * (current - p.entryPrice)
        } else {
            pnl = p.quantity * (p.entryPrice - current)
        }
        unrealized += pnl

        notional := p.quantity * p.entryPrice
        if p.leverage > 0 {
            marginUsed += notional / float64(p.leverage)
        }
    }

    // 可用余额 = 钱包余额 - 保证金占用
    available := t.walletBalance - marginUsed
    if available < 0 {
        available = 0
    }

    return map[string]interface{}{
        "totalWalletBalance":   t.walletBalance,
        "totalUnrealizedProfit": unrealized,
        "availableBalance":      available,
    }, nil
}

// GetPositions 返回当前持仓（与实盘字段保持一致）
func (t *SimTrader) GetPositions() ([]map[string]interface{}, error) {
    result := make([]map[string]interface{}, 0, len(t.positions))
    for _, p := range t.positions {
        md, err := market.Get(p.symbol)
        if err != nil {
            continue
        }
        current := md.CurrentPrice
        pnl := 0.0
        if p.side == "long" {
            pnl = p.quantity * (current - p.entryPrice)
        } else {
            pnl = p.quantity * (p.entryPrice - current)
        }

        result = append(result, map[string]interface{}{
            "symbol":           market.Normalize(p.symbol),
            "side":             p.side,
            "positionAmt":      p.quantity,
            "entryPrice":       p.entryPrice,
            "markPrice":        current,
            "unRealizedProfit": pnl,
            "leverage":         float64(p.leverage),
            "liquidationPrice": 0.0,
        })
    }
    return result, nil
}

// OpenLong 开多仓
func (t *SimTrader) OpenLong(symbol string, quantity float64, leverage int) (map[string]interface{}, error) {
    return t.openPosition(symbol, quantity, leverage, "long")
}

// OpenShort 开空仓
func (t *SimTrader) OpenShort(symbol string, quantity float64, leverage int) (map[string]interface{}, error) {
    return t.openPosition(symbol, quantity, leverage, "short")
}

func (t *SimTrader) openPosition(symbol string, quantity float64, leverage int, side string) (map[string]interface{}, error) {
    md, err := market.Get(symbol)
    if err != nil {
        return nil, err
    }
    price := md.CurrentPrice
    notional := quantity * price
    if leverage <= 0 {
        leverage = 1
    }
    required := notional / float64(leverage)
    fee := notional * t.takerFeeRate

    // 保证金检查
    if t.availableBalance < required+fee {
        return nil, fmt.Errorf("保证金不足: 需要 %.2f, 可用 %.2f", required+fee, t.availableBalance)
    }

    // 扣除费用并占用保证金（可用余额减少，钱包扣费用）
    t.walletBalance -= fee
    t.availableBalance -= required

    key := market.Normalize(symbol) + ":" + side
    t.positions[key] = &simPosition{
        symbol:     market.Normalize(symbol),
        side:       side,
        quantity:   quantity,
        entryPrice: price,
        leverage:   leverage,
    }

    log.Printf("✓ 模拟开仓成功: %s %s 数量=%.6f 价格=%.6f 杠杆=%d", symbol, side, quantity, price, leverage)
    return map[string]interface{}{
        "orderId": int64(0),
        "symbol":  market.Normalize(symbol),
        "status":  "FILLED",
    }, nil
}

// CloseLong 平多仓（quantity=0 表示全部）
func (t *SimTrader) CloseLong(symbol string, quantity float64) (map[string]interface{}, error) {
    return t.closePosition(symbol, quantity, "long")
}

// CloseShort 平空仓（quantity=0 表示全部）
func (t *SimTrader) CloseShort(symbol string, quantity float64) (map[string]interface{}, error) {
    return t.closePosition(symbol, quantity, "short")
}

func (t *SimTrader) closePosition(symbol string, quantity float64, side string) (map[string]interface{}, error) {
    key := market.Normalize(symbol) + ":" + side
    p, ok := t.positions[key]
    if !ok || p.quantity <= 0 {
        return nil, fmt.Errorf("没有持仓: %s %s", symbol, side)
    }
    md, err := market.Get(symbol)
    if err != nil {
        return nil, err
    }
    price := md.CurrentPrice

    // 平仓数量
    qty := p.quantity
    if quantity > 0 && quantity < p.quantity {
        qty = quantity
    }

    // 实现盈亏（USDT本位）
    realized := 0.0
    if side == "long" {
        realized = qty * (price - p.entryPrice)
    } else {
        realized = qty * (p.entryPrice - price)
    }

    notional := qty * price
    fee := notional * t.takerFeeRate

    // 更新钱包余额：加上盈亏，扣除手续费
    t.walletBalance += realized
    t.walletBalance -= fee

    // 释放保证金（按比例释放）
    if p.leverage > 0 {
        marginRelease := (qty * p.entryPrice) / float64(p.leverage)
        t.availableBalance += marginRelease
    }

    // 更新持仓数量
    p.quantity -= qty
    if p.quantity <= 0 || math.IsNaN(p.quantity) {
        delete(t.positions, key)
    }

    log.Printf("✓ 模拟平仓成功: %s %s 数量=%.6f 价格=%.6f 盈亏=%.4f", symbol, side, qty, price, realized)
    return map[string]interface{}{
        "orderId": int64(0),
        "symbol":  market.Normalize(symbol),
        "status":  "FILLED",
    }, nil
}

// SetLeverage 设置杠杆倍数（按symbol记录）
func (t *SimTrader) SetLeverage(symbol string, leverage int) error {
    // 如果已持仓，则更新该仓位杠杆；否则记为未来开仓的默认杠杆
    for _, side := range []string{"long", "short"} {
        key := market.Normalize(symbol) + ":" + side
        if p, ok := t.positions[key]; ok {
            p.leverage = leverage
        }
    }
    return nil
}

// SetMarginMode 设置仓位模式
func (t *SimTrader) SetMarginMode(symbol string, isCrossMargin bool) error {
    t.isCrossMargin = isCrossMargin
    return nil
}

// GetMarketPrice 获取市场价格
func (t *SimTrader) GetMarketPrice(symbol string) (float64, error) {
    md, err := market.Get(symbol)
    if err != nil {
        return 0, err
    }
    return md.CurrentPrice, nil
}

// SetStopLoss 设置止损
func (t *SimTrader) SetStopLoss(symbol string, positionSide string, quantity, stopPrice float64) error {
    side := "long"
    if positionSide == "SHORT" {
        side = "short"
    }
    key := market.Normalize(symbol) + ":" + side
    if p, ok := t.positions[key]; ok {
        p.stopLoss = stopPrice
    }
    return nil
}

// SetTakeProfit 设置止盈
func (t *SimTrader) SetTakeProfit(symbol string, positionSide string, quantity, takeProfitPrice float64) error {
    side := "long"
    if positionSide == "SHORT" {
        side = "short"
    }
    key := market.Normalize(symbol) + ":" + side
    if p, ok := t.positions[key]; ok {
        p.takeProfit = takeProfitPrice
    }
    return nil
}

// CancelStopLossOrders 仅取消止损单
func (t *SimTrader) CancelStopLossOrders(symbol string) error { return nil }

// CancelTakeProfitOrders 仅取消止盈单
func (t *SimTrader) CancelTakeProfitOrders(symbol string) error { return nil }

// CancelAllOrders 取消该币种的所有挂单
func (t *SimTrader) CancelAllOrders(symbol string) error { return nil }

// CancelStopOrders 取消该币种的止盈/止损单
func (t *SimTrader) CancelStopOrders(symbol string) error { return nil }

// FormatQuantity 格式化数量到正确的精度（模拟环境统一到6位）
func (t *SimTrader) FormatQuantity(symbol string, quantity float64) (string, error) {
    return strconv.FormatFloat(quantity, 'f', 6, 64), nil
}