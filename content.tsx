import type { PlasmoCSConfig } from "plasmo"
import React, { useEffect, useState } from "react"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

//mocklista
const BAD_URLS = [
  "contrastchecker.com",
  "neuronwriter.com"
]

const SafeyBanner = () => {
  const [shouldShow, setShouldShow] = useState(false)
  const [isEnabled, setIsEnabled] = useState(true) 
  
  //stany analizy strony
  const [analysisStatus, setAnalysisStatus] = useState<"nieUruchomionoAnalizy" | "loading" | "doneAnalizaStrony">("nieUruchomionoAnalizy")
  const [analysisResult, setAnalysisResult] = useState<string | null>(null)

  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get(["safeyEnabled"], (result) => {
        const enabledStatus = result.safeyEnabled !== false
        setIsEnabled(enabledStatus)

        if (enabledStatus) {
          const domain = window.location.hostname
          if (BAD_URLS.includes(domain)) {
            setShouldShow(true)
          }
        } else {
          setShouldShow(false)
        }
      })
    }
  }, [])

  //tu wejdzie fetch 
  const handleAnalyze = () => {
    setAnalysisStatus("loading")
    
    //na razie symuluj analize
    setTimeout(() => {
      setAnalysisStatus("doneAnalizaStrony")
      //co wykryto?
      setAnalysisResult("elementy na stronie tworzące zagrozenie[wypisz]")
    }, 2000)
  }

  if (!shouldShow) return null

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, width: "50%",
      backgroundColor: "#EF4444", color: "white", zIndex: 999999999,
      fontFamily: "system-ui, -apple-system, sans-serif", padding: "18px 24px",
      display: "flex", flexDirection: "column", gap: "12px", boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
      boxSizing: "border-box", borderRadius: "0 0 0 8px"
    }}>

      <div style={{ display: "flex", alignItems: "center", gap: "15px", width: "100%" }}>
        <div style={{ fontSize: "14px" }}>
          <strong style={{ fontWeight: "700" }}>Uwaga: </strong>Strona wykryta jako potencjalnie niebezpieczna
        </div>
        
        <button 
          onClick={() => window.location.href = "https://google.com"}
          style={{
            backgroundColor: "white", color: "#EF4444", border: "none",
            padding: "8px 16px", borderRadius: "6px", fontWeight: "700",
            cursor: "pointer", marginLeft: "auto", fontSize: "13px",
            whiteSpace: "nowrap"
          }}>
          Opuść stronę (zalecane)
        </button>

        <button 
          disabled={!isEnabled || analysisStatus === "loading" || analysisStatus === "doneAnalizaStrony"}
          onClick={handleAnalyze}
          style={{
            backgroundColor: analysisStatus === "doneAnalizaStrony" ? "#32CD32" : (isEnabled ? "#EF4444" : "#E2E8F0"),
            color: isEnabled ? "white" : "#94A3B8", 
            border: "2px solid white", 
            padding: "8px 16px",
            borderRadius: "6px", 
            fontSize: "13px", 
            fontWeight: "600",
            cursor: isEnabled && analysisStatus === "nieUruchomionoAnalizy" ? "pointer" : "not-allowed",
            whiteSpace: "nowrap",
            transition: "all 0.3s"
          }}>
          {analysisStatus === "nieUruchomionoAnalizy" && "Wyślij stronę do analizy"}
          {analysisStatus === "loading" && "Analizowanie zawartości"}
          {analysisStatus === "doneAnalizaStrony" && "Zakończono analizę"}
        </button>
      </div>

      {analysisResult && (
        <div style={{
          backgroundColor: "rgba(0, 0, 0, 0.2)",
          padding: "12px",
          borderRadius: "6px",
          fontSize: "13px",
          lineHeight: "1.4",
          animation: "fadeIn 0.5s ease-out"
        }}>
          <strong style={{ color: "white" }}>Raport: </strong> {analysisResult}
        </div>
      )}
    </div>
  )
}

export default SafeyBanner