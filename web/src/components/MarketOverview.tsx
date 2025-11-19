import { useState, useEffect, useRef, useCallback } from 'react'
import { TrendingUp, TrendingDown, Activity, Clock, Wifi, WifiOff } from 'lucide-react'

interface MarketData {
  symbol: string
  current_price: number
  price_change_1h: number
  price_change_4h: number
  ema_20: number
  rsi_7: number
  macd: number
  timestamp: string
}

interface SymbolStatus {
  symbol: string
  data?: MarketData
  error?: string
  loading?: boolean
}

export default function MarketOverview() {
  const [symbols, setSymbols] = useState<SymbolStatus[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)

  // Normalize API data structure to match frontend interface
  const normalizeMarketData = useCallback((apiData: any): MarketData | undefined => {
    if (!apiData) return undefined
    
    return {
      symbol: apiData.Symbol || apiData.symbol || '',
      current_price: apiData.CurrentPrice || apiData.current_price || 0,
      price_change_1h: apiData.PriceChange1h || apiData.price_change_1h || 0,
      price_change_4h: apiData.PriceChange4h || apiData.price_change_4h || 0,
      ema_20: apiData.CurrentEMA20 || apiData.ema_20 || 0,
      rsi_7: apiData.CurrentRSI7 || apiData.rsi_7 || 0,
      macd: apiData.CurrentMACD || apiData.macd || 0,
      timestamp: apiData.timestamp || new Date().toISOString()
    }
  }, [])

  // 初始化连接 - 先获取一次初始数据
  const fetchInitialData = useCallback(async () => {
    try {
      const response = await fetch('/api/market/overview')
      const result = await response.json()
      
      if (result.symbols) {
        const updatedSymbols = result.symbols.map((item: any) => ({
          symbol: item.symbol,
          data: item.error ? undefined : normalizeMarketData(item.data),
          error: item.error,
          loading: false
        }))
        setSymbols(updatedSymbols)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch initial market data:', error)
    }
  }, [normalizeMarketData])

  // WebSocket连接管理
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    setConnectionStatus('connecting')
    
    // 创建WebSocket连接
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${wsProtocol}//${window.location.host}/api/ws/market`
    
    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('市场数据WebSocket连接成功')
        setConnectionStatus('connected')
        
        // 清除重连定时器
        if (reconnectTimeoutRef.current) {
          window.clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = null
        }
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          
          if (message.type === 'market_update' && message.symbols) {
            const updatedSymbols = message.symbols.map((item: any) => ({
              symbol: item.symbol,
              data: item.error ? undefined : normalizeMarketData(item.data),
              error: item.error,
              loading: false
            }))
            setSymbols(updatedSymbols)
            setLastUpdate(new Date())
          }
        } catch (error) {
          console.error('WebSocket消息解析失败:', error)
        }
      }

      ws.onclose = () => {
        console.log('市场数据WebSocket连接关闭')
        setConnectionStatus('disconnected')
        wsRef.current = null
        
        // 自动重连
        if (autoRefresh) {
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connectWebSocket()
          }, 5000) // 5秒后重连
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket连接错误:', error)
        setConnectionStatus('disconnected')
      }

    } catch (error) {
      console.error('WebSocket创建失败:', error)
      setConnectionStatus('disconnected')
    }
  }, [autoRefresh, normalizeMarketData])

  // 初始化和清理
  useEffect(() => {
    // 先获取初始数据
    fetchInitialData()
    
    // 如果启用自动刷新，连接WebSocket
    if (autoRefresh) {
      connectWebSocket()
    }
    
    return () => {
      // 清理WebSocket连接
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      
      // 清理重连定时器
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }
  }, [autoRefresh, fetchInitialData, connectWebSocket])

  // 手动刷新连接
  const toggleConnection = () => {
    if (wsRef.current) {
      wsRef.current.close()
    } else {
      connectWebSocket()
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(price)
  }

  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : ''
    return `${sign}${percent.toFixed(2)}%`
  }

  const getPriceChangeColor = (change: number) => {
    return change >= 0 ? '#10B981' : '#EF4444' // green : red
  }

  const getTrendIcon = (change: number) => {
    return change >= 0 ? (
      <TrendingUp className="w-4 h-4" style={{ color: getPriceChangeColor(change) }} />
    ) : (
      <TrendingDown className="w-4 h-4" style={{ color: getPriceChangeColor(change) }} />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #F0B90B 0%, #FCD535 100%)',
              boxShadow: '0 4px 12px rgba(240, 185, 11, 0.3)',
            }}
          >
            <Activity className="w-5 h-5" style={{ color: '#0B0E11' }} />
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ color: '#EAECEF' }}>
              实时行情
            </h3>
            <div className="flex items-center gap-2 text-xs" style={{ color: '#848E9C' }}>
              <Clock className="w-3 h-3" />
              {lastUpdate.toLocaleTimeString('zh-CN')}
            </div>
          </div>
        </div>

        {/* Connection Status and Controls */}
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {connectionStatus === 'connected' ? (
              <Wifi className="w-4 h-4" style={{ color: '#10B981' }} />
            ) : connectionStatus === 'connecting' ? (
              <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <WifiOff className="w-4 h-4" style={{ color: '#EF4444' }} />
            )}
            <span 
              className="text-xs" 
              style={{ 
                color: connectionStatus === 'connected' ? '#10B981' : 
                       connectionStatus === 'connecting' ? '#F59E0B' : '#EF4444' 
              }}
            >
              {connectionStatus === 'connected' ? '实时连接' : 
               connectionStatus === 'connecting' ? '连接中' : '连接断开'}
            </span>
          </div>

          {/* Auto Refresh Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded"
              style={{ accentColor: '#F0B90B' }}
            />
            <span className="text-xs" style={{ color: '#848E9C' }}>
              实时推送
            </span>
          </label>

          {/* Manual Connect/Disconnect Button */}
          <button
            onClick={toggleConnection}
            className="px-2 py-1 rounded text-xs font-medium transition-all hover:opacity-90"
            style={{
              background: connectionStatus === 'connected' ? '#EF4444' : '#10B981',
              color: '#FFFFFF',
            }}
          >
            {connectionStatus === 'connected' ? '断开' : '连接'}
          </button>
        </div>
      </div>

      {/* Market Data List */}
      <div className="space-y-3">
        {symbols.map((symbolStatus) => (
          <div
            key={symbolStatus.symbol}
            className="rounded-lg p-3 transition-all duration-300 hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, rgba(240, 185, 11, 0.05) 0%, rgba(252, 213, 53, 0.02) 100%)',
              border: '1px solid rgba(240, 185, 11, 0.2)',
            }}
          >
            {symbolStatus.loading ? (
              <div className="flex items-center justify-center h-16">
                <div className="animate-spin w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full" />
              </div>
            ) : symbolStatus.error ? (
              <div className="flex items-center justify-center h-16 text-center">
                <div className="text-red-400 text-xs">{symbolStatus.symbol} - 获取失败</div>
              </div>
            ) : symbolStatus.data ? (
              <div className="space-y-2">
                {/* Symbol Header */}
                <div className="flex items-center justify-between">
                  <span className="font-bold" style={{ color: '#EAECEF' }}>
                    {symbolStatus.data.symbol.replace('USDT', '')}
                  </span>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(symbolStatus.data.price_change_1h)}
                    <span 
                      className="text-xs font-medium" 
                      style={{ color: getPriceChangeColor(symbolStatus.data.price_change_1h) }}
                    >
                      {formatPercent(symbolStatus.data.price_change_1h)}
                    </span>
                  </div>
                </div>

                {/* Current Price and Indicators */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-baseline gap-1">
                    <span style={{ color: '#848E9C' }}>$</span>
                    <span className="font-bold" style={{ color: '#EAECEF' }}>
                      {formatPrice(symbolStatus.data.current_price)}
                    </span>
                  </div>
                  
                  <div className="flex gap-3 text-xs">
                    <div className="text-center">
                      <div style={{ color: '#848E9C' }}>EMA20</div>
                      <div style={{ color: '#EAECEF' }}>
                        {symbolStatus.data.ema_20.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div style={{ color: '#848E9C' }}>RSI7</div>
                      <div style={{ 
                        color: symbolStatus.data.rsi_7 > 70 ? '#EF4444' : 
                               symbolStatus.data.rsi_7 < 30 ? '#10B981' : '#EAECEF'
                      }}>
                        {symbolStatus.data.rsi_7.toFixed(0)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div style={{ color: '#848E9C' }}>MACD</div>
                      <div style={{ color: symbolStatus.data.macd >= 0 ? '#10B981' : '#EF4444' }}>
                        {symbolStatus.data.macd.toFixed(3)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-16 text-center">
                <div className="text-xs" style={{ color: '#848E9C' }}>
                  {symbolStatus.symbol} - 暂无数据
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer Note */}
      <div className="p-3 rounded-lg text-xs" style={{
        background: 'linear-gradient(135deg, rgba(240, 185, 11, 0.1) 0%, rgba(252, 213, 53, 0.05) 100%)',
        border: '1px solid rgba(240, 185, 11, 0.2)',
      }}>
        <p className="text-center" style={{ color: '#848E9C' }}>
          📊 实时行情 | WebSocket推送 | 每5秒更新 | 数据仅供参考
        </p>
        <p className="text-center mt-1" style={{ color: '#6B7280' }}>
          {connectionStatus === 'connected' ? '🟢 WebSocket连接正常' : 
           connectionStatus === 'connecting' ? '🟡 WebSocket连接中...' : 
           '🔴 WebSocket连接断开，已切换到轮询模式'}
        </p>
      </div>
    </div>
  )
}