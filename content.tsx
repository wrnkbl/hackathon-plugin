import type { PlasmoCSConfig } from "plasmo"
import React, { useEffect, useState } from "react"

import { analyzeHTML } from "./analiza"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

const API_VERIFY_URL = "https://safey.s1.hcmp.pl/api/Verify"

const SafeyBanner = () => {
  const [shouldShow, setShouldShow] = useState(false)
  const [isEnabled, setIsEnabled] = useState(true) 
  

  const [analysisStatus, setAnalysisStatus] = useState<"nieUruchomionoAnalizy" | "loading" | "doneAnalizaStrony">("nieUruchomionoAnalizy")
  const [analysisResult, setAnalysisResult] = useState<string | null>(null)

  const [urlScore, setUrlScore] = useState<number>(0)

  useEffect(() => {
   
    const messageListener = (request: any, sender: any, sendResponse: (response: any) => void) => {
      if (request.action === "getHtmlAnalysis") {
        const report = analyzeHTML()
        sendResponse(report)
      }
    }
    
    if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(messageListener)
    }

    const fullUrl = window.location.href
    console.log("[Safey] PRÓBA STRZAŁU - Pełny URL strony to:", fullUrl)

    fetch(API_VERIFY_URL, {
      method: "POST",
      headers: {
        "accept": "text/plain",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url: fullUrl })
    })
      .then((response) => response.json())
      .then((data) => {
        if (data) {
                  
                  setUrlScore(data.punkty || 0)}
        
        if (typeof chrome !== "undefined" && chrome.storage) {
          chrome.storage.local.get(["safeyEnabled"], (result) => {
            const currentStatus = result && result.safeyEnabled !== false
            setIsEnabled(currentStatus)

            if ((currentStatus && data && data.czyJestOszustwem === true) || data.punkty != 0){
              setShouldShow(true)
            } else {
              setShouldShow(false)
            }
          })
        } else {
          if (data && data.czyJestOszustwem === true) {
            setShouldShow(true)
          }
        }
      })
      .catch((error) => {
        console.error("[Safey] Błąd połączenia z API bazy danych:", error)
        setShouldShow(false)
      })


    return () => {
      if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.removeListener(messageListener)
      }
    }
  }, [])

  const handleAnalyze = () => {
    setAnalysisStatus("loading")
    setTimeout(() => {
      const report = analyzeHTML()
      setAnalysisStatus("doneAnalizaStrony")
      
      if (report.reasons.length > 0) {
        setAnalysisResult(`Wynik ryzyka: ${report.score} pkt. Wykryte anomalie: ${report.reasons.join(" ")}`)
      } else {
        setAnalysisResult("Analiza kodu nie wykryła anomalii.")
      }
    }, 1200)
  }

  if (!shouldShow) return null

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, width: "50%",
      backgroundColor: urlScore != 0 ? "#F59E0B" : "#EF4444", color: "white", zIndex: 999999999,
      fontFamily: "system-ui, -apple-system, sans-serif", padding: "18px 24px",
      display: "flex", flexDirection: "column", gap: "12px", boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
      boxSizing: "border-box", borderRadius: "0 0 0 8px"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "15px", width: "100%" }}>
        <div style={{ fontSize: "14px" }}>
          <strong style={{ fontWeight: "700" }}>Uwaga: </strong>{urlScore != 0 ? "Strona wykryta jako potencjalnie niebezpieczna" : "Strona znaleziona w bazie stron niebezpiecznych"}
        </div>
        
        <button 
          onClick={() => window.location.href = "about:blank"}
          style={{
            backgroundColor: "white", color: urlScore != 0 ? "#F59E0B" : "#EF4444", border: "none",
            padding: "8px 16px", borderRadius: "6px", fontWeight: "700",
            cursor: "pointer", marginLeft: "auto", fontSize: "13px", whiteSpace: "nowrap"
          }}>
          Opuść stronę (zalecane)
        </button>

        
      </div>

      {analysisResult && (
        <div style={{
          backgroundColor: "rgba(0, 0, 0, 0.2)", padding: "12px", borderRadius: "6px",
          fontSize: "13px", lineHeight: "1.4", animation: "fadeIn 0.5s ease-out"
        }}>
          <strong style={{ color: "white" }}>Raport: </strong> {analysisResult}
        </div>
      )}
    </div>
  )
}

export default SafeyBanner