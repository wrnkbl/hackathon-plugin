import React, { useEffect, useState } from "react"

export const config = {
  manifest: {
    permissions: ["activeTab", "storage", "scripting"],
    host_permissions: ["https://*/*", "file:///*"]
  }
}

const API_VERIFY_URL = "https://safey.s1.hcmp.pl/api/Verify"

function IndexPopup() {
  const [isEnabled, setIsEnabled] = useState(true)
  const [isVerifiedBank, setIsVerifiedBank] = useState(false)
  const [isDangerousSite, setIsDangerousSite] = useState(false) 
  const [currentDomain, setCurrentDomain] = useState("")
  const [platformName, setPlatformName] = useState<string | null>(null)
  
  const [urlScore, setUrlScore] = useState<number>(0)

  const [popupAnalysisStatus, setPopupAnalysisStatus] = useState<"nieUruchomiono" | "loading" | "done">("nieUruchomiono")
  const [popupAnalysisReasons, setPopupAnalysisReasons] = useState<string[]>([])
  const [popupAnalysisScore, setPopupAnalysisScore] = useState<number>(0)

  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get(["safeyEnabled"], (result) => {
        if (result.safeyEnabled !== undefined) {
          setIsEnabled(result.safeyEnabled)
        }
      })
    }

    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.url) {
          try {
            const fullUrl = tabs[0].url
            const urlObj = new URL(fullUrl)
            setCurrentDomain(urlObj.hostname.replace("www.", ""))

            fetch(API_VERIFY_URL, {
              method: "POST",
              headers: {
                "accept": "application/json",
                "Content-Type": "application/json"
              },
              body: JSON.stringify({ url: fullUrl })
            })
              .then((response) => response.json())
              .then((data) => {
                if (data) {
                  setUrlScore(data.punkty || 0)

                  if (data.czyJestOszustwem === true) {
                    setIsDangerousSite(true)
                    setIsVerifiedBank(false)
                  } else if (data.czyJestOszustwem === false && data.platforma !== null) {
                    setIsVerifiedBank(true)
                    setIsDangerousSite(false)
                    setPlatformName(data.platforma)
                  } else {
                    setIsVerifiedBank(false)
                    setIsDangerousSite(false)
                  }
                }
              })
              .catch((error) => {
                console.error("[Safey Popup] Błąd połączenia z API Verify:", error)
                setIsVerifiedBank(false)
                setIsDangerousSite(false)
              })
          } catch (e) {
            setCurrentDomain("Plik lokalny")
            setIsVerifiedBank(false)
            setIsDangerousSite(false)
          }
        }
      })
    }
  }, [])

  const handlePopupAnalyze = () => {
    if (typeof chrome === "undefined" || !chrome.tabs) return

    setPopupAnalysisStatus("loading")
    setPopupAnalysisReasons([])
    setPopupAnalysisScore(0)

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0]
      const tabId = activeTab?.id

      if (!tabId) {
        setPopupAnalysisStatus("nieUruchomiono")
        return
      }

      // Strzał BEZPOŚREDNIO do zawartości strony, raportujemy tylko HTML
      chrome.tabs.sendMessage(tabId, { action: "getHtmlAnalysis" }, (htmlReport: any) => {
        setPopupAnalysisStatus("done")
        
        if (chrome.runtime.lastError || !htmlReport) {
          setPopupAnalysisScore(0)
          setPopupAnalysisReasons(["Analiza HTML niedostępna na tej karcie (np. zablokowany plik lokalny)."])
          return
        }

        // Bierzemy punkty i powody wyłącznie z analiza.ts
        if (htmlReport.score > 0) {
          const finalReasons = ["Wykryto anomalie w kodzie strony!", ...htmlReport.reasons]
          setPopupAnalysisScore(htmlReport.score)
          setPopupAnalysisReasons(finalReasons)
        } else {
          setPopupAnalysisScore(0)
          setPopupAnalysisReasons(["Analiza zawartości strony nie wykryła anomalii."])
        }
      })
    })
  }

  const toggleProtection = () => {
    const newState = !isEnabled
    setIsEnabled(newState)
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.set({ safeyEnabled: newState }, () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) chrome.tabs.reload(tabs[0].id)
        })
      })
    }
  }

  const getDotColor = () => {
    if (!isEnabled) return "#CBD5E1"
    if (isVerifiedBank) return "#10B981" 
    if (isDangerousSite) return "#EF4444" 
    return "#CBD5E1"
  }

  const shouldShowStatusSection = isVerifiedBank || isDangerousSite

  return (
    <div style={{
      width: "280px", padding: "20px", fontFamily: "system-ui, -apple-system, sans-serif",
      backgroundColor: "#FFFFFF", color: "#0F172A"
    }}>
      
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <img 
          src={require("url:./assets/icon.png")} 
          alt="Safey Logo" 
          style={{ width: "42px", height: "35px", borderRadius: "6px" }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = "chrome-extension://" + chrome.runtime.id + "/tabs/icon.png"
          }}
        />
        <span style={{ fontSize: "20px", fontWeight: "800", color: "#6366F1", letterSpacing: "-0.5px" }}>
          Safey
        </span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "12px" }}>
        <span style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>
          Status ochrony: <span style={{ color: isEnabled ? "#10B981" : "#64748B" }}>{isEnabled ? "ON" : "OFF"}</span>
        </span>
        <button 
          onClick={toggleProtection}
          style={{
            backgroundColor: isEnabled ? "#EF4444" : "#10B981", color: "white",
            border: "none", padding: "6px 12px", borderRadius: "6px",
            fontSize: "12px", fontWeight: "700", cursor: "pointer", transition: "all 0.2s"
          }}>
          {isEnabled ? "Wyłącz" : "Włącz"}
        </button>
      </div>

      {shouldShowStatusSection && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px", padding: "10px 0", borderTop: "1px solid #F1F5F9", borderBottom: "1px solid #F1F5F9" }}>
          <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: getDotColor(), boxShadow: isEnabled && (isVerifiedBank || isDangerousSite) ? `0 0 8px ${getDotColor()}` : "none", transition: "0.2s" }} />
          <span style={{ fontSize: "14px", fontWeight: "500", color: isEnabled ? "#0F172A" : "#94A3B8" }}>
            {isVerifiedBank && (
              <>
                Strona zweryfikowana w bazie Safey: <strong>{platformName}</strong>
              </>
            )}
            {isDangerousSite && "Strona w bazie zagrożeń!"}
          </span>
        </div>
      )}

      <button 
        disabled={!isEnabled || popupAnalysisStatus === "loading" || isDangerousSite}
        onClick={handlePopupAnalyze}
        style={{
          display: isDangerousSite ? "none" : "block",
          width: "100%", 
          backgroundColor: popupAnalysisStatus === "done" ? "#10B981" : (isEnabled ? "#5A5ADE" : "#E2E8F0"),
          color: (isEnabled || isDangerousSite) ? "white" : "#94A3B8", border: "none", padding: "10px",
          borderRadius: "6px", fontSize: "13px", fontWeight: "600",
          cursor: (isEnabled && popupAnalysisStatus !== "loading" && !isDangerousSite) ? "pointer" : "not-allowed",
          marginTop: shouldShowStatusSection ? "0px" : "10px", transition: "all 0.3s"
        }}>
        {isDangerousSite ? "Analiza zablokowana (zagrożenie)" : (
          <>
            {popupAnalysisStatus === "nieUruchomiono" && "Wyślij stronę do analizy"}
            {popupAnalysisStatus === "loading" && "Analizowanie zawartości HTML..."}
            {popupAnalysisStatus === "done" && "Wyślij stronę do analizy"}
          </>
        )}
      </button>

      {popupAnalysisReasons.length > 0 && !isDangerousSite && (
        <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", padding: "12px", borderRadius: "6px", fontSize: "12px", lineHeight: "1.4", marginTop: "12px", color: "#334155" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <strong style={{ color: "#0F172A" }}>Raport:</strong>
            {popupAnalysisScore > 0 && (
              <span style={{ fontWeight: "bold", color: popupAnalysisScore >= 40 ? "#EF4444" : "#F59E0B" }}>
                {popupAnalysisScore} punktów
              </span>
            )}
          </div>
          <ul style={{ margin: 0, paddingLeft: "16px", color: "#475569" }}>
            {popupAnalysisReasons.map((reason, index) => (
              <li key={index} style={{ marginBottom: "4px" }}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default IndexPopup