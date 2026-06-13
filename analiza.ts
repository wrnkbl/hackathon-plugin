

export interface AnalysisReport {
  score: number;
  reasons: string[];
  isDangerous: boolean;
}

export function analyzeHTML(): AnalysisReport {
  let score = 0;
  const reasons: string[] = [];

  // 1. Sprawdzenie formularzy (<form>) i dokąd wysyłają dane
  const forms = document.querySelectorAll("form");
  forms.forEach((form) => {
    const action = form.getAttribute("action");
    if (action) {
      // Jeśli akcja formularza prowadzi do zewnętrznego URL (zaczyna się od http/https)
      // i nie zawiera w sobie aktualnej domeny, to potężny powód do niepokoju
      if (action.startsWith("http") && !action.includes(window.location.hostname)) {
        score += 40;
        reasons.push("Formularz logowania/płatności wysyła dane na obcy serwer.");
      }
    }
  });

  // 2. Szukanie haseł podwyższonego ryzyka (Inżynieria społeczna)
  const pageText = document.body.innerText.toLowerCase();
  const riskyWords = [
    "zablokowane konto", 
    "zweryfikuj tożsamość",
    "dopłać", 
    "szybka wpłata", 
    "weryfikacja", 
    "paczka zatrzymana"
  ];

  let foundWordsCount = 0;
  riskyWords.forEach((word) => {
    if (pageText.includes(word)) {
      foundWordsCount++;
    }
  });

  if (foundWordsCount > 0) {
    score += foundWordsCount * 15;
    const foundWords = riskyWords.filter((word) => pageText.includes(word));
    reasons.push(`Słowa kluczowe: ${foundWords.join(", ")}.`);
  }

  // 3. Analiza anomalii obrazków (skopiowany layout)
  const images = document.querySelectorAll("img");
  let externalImages = 0;
  
  images.forEach((img) => {
    const src = img.getAttribute("src");
    if (src && src.startsWith("http") && !src.includes(window.location.hostname)) {
      externalImages++;
    }
  });

  // Jeśli strona ma mało grafik, ale większość z nich ładuje się z zewnętrznych serwerów
  if (images.length > 3 && (externalImages / images.length) > 0.6) {
    score += 25;
    reasons.push("Większość obrazków pochodzi z zewnętrznego serwera (podejrzenie sklonowania wyglądu)");
  }

  // Ustalenie progu krytycznego (np. 45 punktów)
  const isDangerous = score >= 45;

  return {
    score,
    reasons,
    isDangerous
  };
}