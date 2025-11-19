import MarketOverview from '../components/MarketOverview'
import { Container } from '../components/Container'
import { TrendingUp, Activity } from 'lucide-react'

/**
 * 市场行情页面
 * 
 * 专门显示实时加密货币行情数据
 * 包括价格变化、技术指标等
 */
export default function MarketPage() {
  return (
    <Container className="py-6 pt-24">
      {/* Page Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #F0B90B 0%, #FCD535 100%)',
              boxShadow: '0 8px 24px rgba(240, 185, 11, 0.4)',
            }}
          >
            <TrendingUp className="w-8 h-8" style={{ color: '#0B0E11' }} />
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-4" style={{ color: '#EAECEF' }}>
          实时行情
        </h1>
        <p className="text-lg mb-8" style={{ color: '#848E9C' }}>
          📊 实时追踪主流加密货币价格变化和技术指标
        </p>
      </div>

      {/* Market Overview Content */}
      <div className="max-w-6xl mx-auto">
        <MarketOverview />
      </div>

      {/* Additional Info Section */}
      <div className="mt-12 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Market Features */}
          <div
            className="p-6 rounded-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(240, 185, 11, 0.05) 0%, rgba(252, 213, 53, 0.02) 100%)',
              border: '1px solid rgba(240, 185, 11, 0.2)',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-6 h-6" style={{ color: '#F0B90B' }} />
              <h3 className="text-xl font-bold" style={{ color: '#EAECEF' }}>
                实时数据特性
              </h3>
            </div>
            <ul className="space-y-2 text-sm" style={{ color: '#848E9C' }}>
              <li>• 每30秒自动更新市场数据</li>
              <li>• 支持主流加密货币实时报价</li>
              <li>• 提供EMA20、RSI7、MACD技术指标</li>
              <li>• 显示1小时和4小时价格变化趋势</li>
              <li>• 数据来源于Binance API，确保准确性</li>
            </ul>
          </div>

          {/* Trading Indicators Guide */}
          <div
            className="p-6 rounded-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(240, 185, 11, 0.05) 0%, rgba(252, 213, 53, 0.02) 100%)',
              border: '1px solid rgba(240, 185, 11, 0.2)',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6" style={{ color: '#F0B90B' }} />
              <h3 className="text-xl font-bold" style={{ color: '#EAECEF' }}>
                技术指标说明
              </h3>
            </div>
            <ul className="space-y-2 text-sm" style={{ color: '#848E9C' }}>
              <li><span style={{ color: '#EAECEF' }}>EMA20:</span> 20日指数移动平均线，反映中期趋势</li>
              <li><span style={{ color: '#EAECEF' }}>RSI7:</span> 7日相对强弱指数，超买超卖指标</li>
              <li><span style={{ color: '#EAECEF' }}>MACD:</span> 移动平均收敛散度，动量指标</li>
              <li><span style={{ color: '#10B981' }}>绿色数值:</span> 上涨或看涨信号</li>
              <li><span style={{ color: '#EF4444' }}>红色数值:</span> 下跌或看跌信号</li>
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div
          className="mt-8 p-6 rounded-lg text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(240, 185, 11, 0.1) 0%, rgba(252, 213, 53, 0.05) 100%)',
            border: '1px solid rgba(240, 185, 11, 0.2)',
          }}
        >
          <p className="text-sm" style={{ color: '#848E9C' }}>
            <strong>风险提示:</strong> 市场数据仅供参考，不构成投资建议
          </p>
          <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
            加密货币交易具有高风险，请在充分了解风险的基础上进行投资决策
          </p>
        </div>
      </div>
    </Container>
  )
}