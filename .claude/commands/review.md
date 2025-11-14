---
description: Umfassende Code-Review mit Qualitätsanalyse
allowed-tools: Read, Grep, Glob, Bash(git diff:*), Bash(git status:*), Bash(git log:*)
argument-hint: [file-path oder directory]
---

# Code Review

Führe eine umfassende Code-Review durch für: **$ARGUMENTS**

## Aktueller Stand

### Git Änderungen
!`git diff HEAD`

### Git Status
!`git status --short`

---

## Review-Checkliste

Analysiere den Code systematisch nach folgenden Kriterien:

### 1. Code-Qualität
- **Lesbarkeit**: Ist der Code leicht verständlich?
- **Naming Conventions**: Sind Variablen, Funktionen und Klassen sinnvoll benannt?
- **Code-Organisation**: Ist der Code logisch strukturiert?
- **DRY-Prinzip**: Gibt es Code-Duplikate, die vermieden werden könnten?
- **Komplexität**: Sind Funktionen zu lang oder zu komplex?

### 2. Best Practices
- **Design Patterns**: Werden passende Patterns verwendet?
- **Error Handling**: Werden Fehler korrekt behandelt (try-catch, error boundaries)?
- **Edge Cases**: Sind Randfälle abgedeckt?
- **Performance**: Gibt es offensichtliche Performance-Probleme?
- **React Best Practices**: Hooks korrekt verwendet? Unnecessary re-renders vermieden?

### 3. Sicherheit
- **Input Validation**: Werden User-Inputs validiert?
- **XSS-Schutz**: Ist gegen Cross-Site-Scripting geschützt?
- **SQL Injection**: Bei Datenbankzugriffen geschützt?
- **Authentication/Authorization**: Sind sensible Bereiche geschützt?
- **Sensitive Daten**: Werden API-Keys, Secrets sicher behandelt?
- **OWASP Top 10**: Bekannte Sicherheitslücken vermieden?

### 4. Testing
- **Test Coverage**: Gibt es Tests für den Code?
- **Test-Qualität**: Sind die Tests aussagekräftig?
- **Edge Cases in Tests**: Sind Randfälle getestet?
- **Test-Struktur**: Sind Tests gut organisiert und wartbar?

### 5. TypeScript/Types
- **Type Safety**: Werden `any` oder type assertions vermieden?
- **Interfaces/Types**: Sind Typen klar definiert?
- **Generics**: Werden Generics sinnvoll eingesetzt?
- **Null Safety**: Werden null/undefined Checks gemacht?

### 6. Dokumentation
- **Code-Kommentare**: Sind komplexe Stellen kommentiert?
- **JSDoc/TSDoc**: Sind Funktionen dokumentiert?
- **README Updates**: Braucht die README ein Update?
- **Type Definitions**: Sind Types selbsterklärend?

---

## Output Format

Strukturiere deine Review wie folgt:

### 📊 Zusammenfassung
- Kurzer Überblick über die Qualität des Codes
- Anzahl der gefundenen Issues pro Kategorie

### 🔍 Detaillierte Findings

Für jedes gefundene Problem:

**[Priorität] Kategorie: Kurzbeschreibung**
- **Datei**: `pfad/zur/datei.tsx:123`
- **Problem**: Detaillierte Beschreibung
- **Empfehlung**: Wie kann es behoben werden?
- **Code-Beispiel** (falls hilfreich):
  ```typescript
  // Vorher
  const bad = ...

  // Nachher
  const good = ...
  ```

### ✅ Positive Aspekte
Liste auch Dinge auf, die gut gemacht sind:
- Gute Practices
- Sauberer Code
- Gute Tests
- etc.

### 🎯 Empfohlene Nächste Schritte
Priorisierte Liste von Verbesserungen:
1. Kritische Issues zuerst
2. Wichtige Verbesserungen
3. Nice-to-have Optimierungen

---

## Prioritäten

Verwende diese Prioritätsstufen:

- 🔴 **CRITICAL**: Muss sofort behoben werden (Security, Bugs)
- 🟡 **IMPORTANT**: Sollte zeitnah behoben werden (Code Quality, Best Practices)
- 🟢 **NICE-TO-HAVE**: Kann verbessert werden (Optimierungen, Refactorings)
- ⚪ **INFO**: Hinweis, keine Aktion nötig

---

## Spezielle Prüfungen für Next.js/React

- **Server vs Client Components**: Korrekte Verwendung von "use client"/"use server"?
- **Data Fetching**: Optimale Strategie (SSR, SSG, CSR)?
- **Image Optimization**: next/image verwendet?
- **Metadata**: SEO-Metadaten korrekt?
- **Performance**: Core Web Vitals beachtet?
- **Hooks Dependencies**: useEffect/useMemo/useCallback Dependencies korrekt?

Beginne jetzt mit der Review!
