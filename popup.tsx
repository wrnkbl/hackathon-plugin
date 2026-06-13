import React, { useEffect, useState } from "react"

const VERIFIED_BANKS = [
  "pkobp.pl",
  "mbank.pl",
  "ingbank.pl",
  "santander.pl",
]
const BAD_URLS= [
  "contrastchecker.com",
  "neuronwriter.com",
]

function IndexPopup() {
  const [isEnabled, setIsEnabled] = useState(true)
  
  const [isVerifiedBank, setIsVerifiedBank] = useState(false)
  const [isDangerousSite, setIsDangerousSite] = useState(false) //synchro z content.tsx
  const [currentDomain, setCurrentDomain] = useState("")

  useEffect(() => {
    //stan z pamieci chrome
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get(["safeyEnabled"], (result) => {
        if (result.safeyEnabled !== undefined) {
          setIsEnabled(result.safeyEnabled)
        }
      })
    }

    //spr z baza bankow oraz zlych stron
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.url) {
          try {
            const urlObj = new URL(tabs[0].url)
            const domain = urlObj.hostname.replace("www.", "")
            setCurrentDomain(domain)
            if (VERIFIED_BANKS.includes(domain)) {
              setIsVerifiedBank(true)
              setIsDangerousSite(false)
            } 
            else if (BAD_URLS.includes(domain)) {
              setIsDangerousSite(true)
              setIsVerifiedBank(false)
            } 
            else {
              setIsVerifiedBank(false)
              setIsDangerousSite(false)
            }
          } catch (e) {
            setIsVerifiedBank(false)
            setIsDangerousSite(false)
          }
        }
      })
    }
  }, [])

  const toggleProtection = () => {
    const newState = !isEnabled
    setIsEnabled(newState)
    
    //zapisz stan aby byl dostepny w content script
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.set({ safeyEnabled: newState }, () => {
        //po zapisaniu odświeżamy aktywną karte aby baner zniknal lub sie pojawil
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) chrome.tabs.reload(tabs[0].id)
        })
      })
    }
  }
//kolor kropki
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <span style={{ fontSize: "14px", fontWeight: "600" }}>
          Plugin: <span style={{ color: isEnabled ? "#10B981" : "#64748B" }}>{isEnabled ? "ON" : "OFF"}</span>
        </span>
        <button 
          onClick={toggleProtection}
          style={{
            backgroundColor: isEnabled ? "#EF4444" : "#10B981", color: "white",
            border: "none", padding: "6px 12px", borderRadius: "6px",
            fontSize: "12px", fontWeight: "bold", cursor: "pointer"
          }}>
          {isEnabled ? "Wyłącz" : "Włącz"}
        </button>
      </div>

      {/*sekcja bank/str niebezpieczna*/}
      {shouldShowStatusSection && (
        <div style={{ 
          display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px",
          padding: "10px 0", borderTop: "1px solid #F1F5F9", borderBottom: "1px solid #F1F5F9"
        }}>
          <div style={{
            width: "12px", height: "12px", borderRadius: "50%",
            backgroundColor: getDotColor(), 
            boxShadow: isEnabled && (isVerifiedBank || isDangerousSite) ? `0 0 8px ${getDotColor()}` : "none",
            transition: "0.2s"
          }} />
          <span style={{ 
            fontSize: "14px", 
            fontWeight: "500", 
            color: isEnabled ? "#0F172A" : "#94A3B8" 
          }}>
            {isVerifiedBank ? "Zweryfikowana strona banku" : "Strona potencjalnie niebezpieczna"}
          </span>
        </div>
      )}

      <button 
        disabled={!isEnabled}
        style={{
          width: "100%", backgroundColor: isEnabled ? "#5A5ADE" : "#E2E8F0",
          color: isEnabled ? "white" : "#94A3B8", border: "none", padding: "10px",
          borderRadius: "6px", fontSize: "13px", fontWeight: "600",
          cursor: isEnabled ? "pointer" : "not-allowed",
          marginTop: shouldShowStatusSection ? "0px" : "10px" 
        }}>
        Wyślij stronę do analizy
      </button>
    </div>
  )
}

export default IndexPopup