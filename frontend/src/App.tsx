import { useState, useEffect } from 'react'

interface SignalResponse {
  signal: number
  success: boolean
  message: string
  timestamp: number
}

function App() {
  const [signalData, setSignalData] = useState<SignalResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSignal = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/signal')
      const data: SignalResponse = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch signal')
      }
      
      setSignalData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
      setSignalData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Fetch signal on component mount
    fetchSignal()
    
    // Set up auto-refresh every 3 seconds
    const interval = setInterval(fetchSignal, 3000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <h1 className="text-4xl font-bold text-white mb-8 text-center">
            Signal Monitor
          </h1>
          
          <div className="space-y-6">
            {/* Signal Display Card */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Current Signal</h2>
                <button
                  onClick={fetchSignal}
                  disabled={loading}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200"
                >
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              
              {loading && !signalData && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
                </div>
              )}
              
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
                  <p className="text-red-200 font-medium">Error: {error}</p>
                </div>
              )}
              
              {signalData && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Signal Value:</span>
                    <span className="text-3xl font-bold text-primary-400">
                      {signalData.signal}
                    </span>
                  </div>
                  
                  <div className="h-px bg-white/10"></div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Status:</span>
                    <div className="flex items-center gap-2">
                      {signalData.success ? (
                        <>
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-green-400 font-semibold">Success</span>
                        </>
                      ) : (
                        <>
                          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="text-red-400 font-semibold">Failed</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="h-px bg-white/10"></div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Message:</span>
                    <span className={`font-medium ${
                      signalData.success ? 'text-green-300' : 'text-red-300'
                    }`}>
                      {signalData.message}
                    </span>
                  </div>
                  
                  <div className="h-px bg-white/10"></div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Timestamp:</span>
                    <span className="text-gray-400 text-sm">
                      {new Date(signalData.timestamp * 1000).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Status Indicator */}
            {signalData && (
              <div className={`rounded-xl p-4 border-2 ${
                signalData.success 
                  ? 'bg-green-500/20 border-green-500/50' 
                  : 'bg-red-500/20 border-red-500/50'
              }`}>
                <div className="flex items-center justify-center gap-3">
                  {signalData.success ? (
                    <>
                      <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-green-300 font-semibold text-lg">
                        Connection Successful
                      </p>
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-red-300 font-semibold text-lg">
                        Connection Failed
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
