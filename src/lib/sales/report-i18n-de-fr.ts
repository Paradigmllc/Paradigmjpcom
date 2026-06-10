/**
 * report-i18n-de-fr.ts — German (Deutsch) + French (Français)
 * de: Sie-Form
 * fr: Vouvoiement (vous form)
 */

import type { ReportLocaleData } from "./report-i18n-shared"

/* ═══════════════════════════════════════════════════════════════════════════
   de — German (Deutsch)  |  Sie-Form
   ═══════════════════════════════════════════════════════════════════════════ */

export const DE: ReportLocaleData = {
  ui: {
    brand: "Paradigm Revenue OS",
    privateReport: "Geschäftsführungs-Diagnosebericht",
    validity: "Gültig bis",
    heroKicker: "Vertrauliche Unternehmensanalyse",
    heroLead:
      "Auf Basis öffentlicher Daten, erfasster Signale und einer Verbesserungsdemo haben wir den klarsten ersten Schritt in den Bereichen Umsatz, Vertrauen und Anfrageprozess herausgearbeitet.",
    evidenceReady: "Erfasste Daten",
    sourceCoverage: "Datenabdeckung",
    monthlyLoss: "Geschätzter monatlicher Opportunitätsverlust",
    confidence: "Datenvertrauenswürdigkeit",
    currentState: "Aktuelle Reibungspunkte",
    improvedState: "Verbesserter Zustand",
    diagnosticSurface: "Diagnoseumfang",
    priorityFindings: "Prioritäre Erkenntnisse",
    businessImpact: "Geschäftliche Auswirkung",
    firstMove: "Erster Schritt",
    whyItMatters: "Warum es wichtig ist",
    evidence: "Belege",
    recommendation: "Empfohlene Maßnahme",
    roadmap: "30-Tage-Roadmap",
    dataAppendix: "Datenverzeichnis",
    sourceMeaning: "Geschäftliche Bedeutung",
    sourceNext: "Nächste Prüfung",
    sourceMissing:
      "Fehlende Datenquellen werden nicht als Fakten behandelt, sondern als Hypothesen für die nächste Überprüfung.",
    templateDirection: "Vorschlagsrichtung",
    qualityBar: "Qualitätsmaßstab",
    finalHeading: "In 30 Minuten den ersten Fix festlegen",
    finalBody:
      "Vor einem großen Umbau ermitteln wir gemeinsam, welcher Bereich — Umsatzchance, Vertrauensnachweis oder Anfrageprozess — am schnellsten Ergebnisse liefert.",
    emailSubject: "Ihr Diagnosebericht",
    competitorBenchmark: "Wettbewerbs- und Branchenvergleich",
    yourSite: "Ihre Website",
    industryAvg: "Branchendurchschnitt",
    topCompetitors: "Top-Wettbewerber",
    roiTitle: "ROI-Prognose",
    paybackPeriod: "Geschätzte Amortisationszeit",
    recoveredTwelveMonths: "12-Monats-Umsatzrückgewinnung",
    roiLabel: "Prognostizierter ROI",
    faqTitle: "Häufig gestellte Fragen",
    readMore: "Detaillierte Analyse lesen",
  },
  cta: [
    "Verbesserungsdemo ansehen",
    "Kostenlose Beratung vereinbaren",
    "Vollständige Diagnose lesen",
    "Jetzt Verbesserung starten",
  ],
  faq: [
    {
      q: "Müssen wir unser bestehendes Hosting oder unsere Domain aufgeben?",
      a: "Nein. Wir bauen und testen die leistungsoptimierte Präsentationsschicht in einer Staging-Umgebung und wechseln sie nach Freigabe ohne Ausfallzeit live. Ihre bestehende Infrastruktur bleibt unverändert — wir haben Lighthouse-Scores von 40 auf über 90 Punkte gesteigert, ohne das Backend anzutasten.",
    },
    {
      q: "Ist der mobile Lighthouse-Score von 85+ garantiert?",
      a: "Ja. Unser Astro/Next.js-Optimierungspaket garantiert einen mobilen Lighthouse-Score von mindestens 85 Punkten. Wird dieser Wert nicht erreicht, erstatten wir die Performance-Optimierungsgebühr vollständig zurück. Der Durchschnitt aller Projekte seit 2024 liegt bei 92 Punkten.",
    },
    {
      q: "Wie sieht der Ablauf aus und wie lange dauert es?",
      a: "Ist-Analyse (3 Tage) → Visueller Neuaufbau mit Astro/Next.js (5–7 Tage) → Staging-Validierung (3 Tage) → Live-Schaltung (1 Tag). Der gesamte Zyklus kann in nur 2 Wochen abgeschlossen werden. Von Ihrer Seite sind nur zwei Termine erforderlich: das Kick-off-Gespräch und die finale Freigabe.",
    },
    {
      q: "Funktioniert das auch mit unserer bestehenden Agentur oder IT-Abteilung?",
      a: "Selbstverständlich. Wir agieren als chirurgische Performance-Schicht — wir müssen weder Ihre Agentur noch Ihr CMS oder Ihr internes Entwicklerteam ersetzen. Wir liefern eine eigenständige Präsentationsschicht, die sich nahtlos integriert, und übergeben bearbeitbare Templates für die Pflege durch Ihr Team.",
    },
    {
      q: "Welche spezifischen Anforderungen deutscher KMU werden berücksichtigt?",
      a: "Unser Paket berücksichtigt gezielt die Anforderungen des deutschen Mittelstands: DSGVO-konforme Cookie-freie Analyse, Impressumspflicht-Optimierung, Barrierefreiheit nach BITV/WCAG, sowie regionale SEO für DACH-Märkte. Darüber hinaus unterstützen wir die Integration mit gängigen deutschen Shopsystemen und ERP-Lösungen.",
    },
  ],
  reassurance: [
    "14 Tage bis zur Verbesserung — vom Kick-off bis zum Go-Live in nur 2 Wochen",
    "Leistungsgarantie — vollständige Rückerstattung bei Nichterreichen des Lighthouse 85+-Ziels",
    "Über 50 betreute KMU — aus Fertigung, Bau, Dienstleistung, Beauty und mehr",
    "Zero-Downtime-Deployment — Ihre bestehenden Systeme bleiben durchgängig online",
  ],
  offerBadges: [
    "Schnell wirksame Optimierung",
    "Ohne Code editierbar",
    "Mobil optimiert",
    "DSGVO-konform",
    "Leistungsgarantie",
  ],
  culturalNotes: {
    toneDescription:
      "Durchgängige Sie-Form im gesamten Bericht. Formelle, aber nicht verstaubte Geschäftssprache. Deutsche KMU-Entscheider schätzen präzise, faktenbasierte Aussagen — kein Marketing-Buzzword. Substantive und Komposita korrekt verwenden, Anglizismen auf ein Minimum reduzieren.",
    formalityLevel: "Sie-Form (formelle Höflichkeitsform)",
    pronounPreference: "Sie / Ihr (geschäftlich-formell)",
  },
}

/* ═══════════════════════════════════════════════════════════════════════════
   fr — French (Français)  |  Vouvoiement (vous form)
   ═══════════════════════════════════════════════════════════════════════════ */

export const FR: ReportLocaleData = {
  ui: {
    brand: "Paradigm Revenue OS",
    privateReport: "Rapport de diagnostic stratégique",
    validity: "Valable jusqu'au",
    heroKicker: "Diagnostic stratégique confidentiel",
    heroLead:
      "À partir des données publiques, des signaux collectés et d'une démo d'amélioration, nous avons identifié le premier levier à actionner parmi le chiffre d'affaires, la confiance et le parcours de contact.",
    evidenceReady: "Données collectées",
    sourceCoverage: "Couverture des données",
    monthlyLoss: "Perte d'opportunité mensuelle estimée",
    confidence: "Fiabilité des données",
    currentState: "Frictions actuelles",
    improvedState: "État après amélioration",
    diagnosticSurface: "Périmètre du diagnostic",
    priorityFindings: "Constatations prioritaires",
    businessImpact: "Impact commercial",
    firstMove: "Première action",
    whyItMatters: "Pourquoi c'est important",
    evidence: "Preuves",
    recommendation: "Action recommandée",
    roadmap: "Feuille de route 30 jours",
    dataAppendix: "Registre des données",
    sourceMeaning: "Signification commerciale",
    sourceNext: "Prochaine vérification",
    sourceMissing:
      "Les sources manquantes ne sont pas traitées comme des faits, mais comme des hypothèses à vérifier lors de la prochaine revue.",
    templateDirection: "Orientation de la proposition",
    qualityBar: "Barre de qualité",
    finalHeading: "30 minutes pour choisir la première correction",
    finalBody:
      "Avant une refonte complète, identifions ensemble le levier le plus rentable entre opportunité de chiffre d'affaires, preuve de confiance et parcours de contact.",
    emailSubject: "À propos du rapport de diagnostic",
    competitorBenchmark: "Comparatif concurrents et secteur",
    yourSite: "Votre site",
    industryAvg: "Moyenne du secteur",
    topCompetitors: "Top concurrents",
    roiTitle: "Simulation du retour sur investissement",
    paybackPeriod: "Délai de récupération estimé",
    recoveredTwelveMonths: "Chiffre d'affaires récupéré sur 12 mois",
    roiLabel: "ROI projeté",
    faqTitle: "Questions fréquentes",
    readMore: "Lire l'analyse détaillée",
  },
  cta: [
    "Voir la démo d'amélioration",
    "Réserver une consultation gratuite",
    "Lire le diagnostic complet",
    "Commencer l'amélioration",
  ],
  faq: [
    {
      q: "Devons-nous abandonner notre hébergement ou notre domaine actuel ?",
      a: "Non. Nous construisons et testons la couche de présentation optimisée dans un environnement de staging, puis la basculons en production sans interruption de service. Votre infrastructure existante reste intacte — nous avons fait passer des scores Lighthouse de 40 à plus de 90 points sans modifier le backend dans de nombreux projets.",
    },
    {
      q: "Le score Lighthouse mobile de 85+ est-il vraiment garanti ?",
      a: "Oui. Notre package d'optimisation Astro/Next.js garantit un score Lighthouse mobile de 85 points minimum. Si ce seuil n'est pas atteint, nous remboursons intégralement les frais d'optimisation de performance. La moyenne de tous nos projets depuis 2024 est de 92 points.",
    },
    {
      q: "Quel est le processus et combien de temps cela prend-il ?",
      a: "Audit initial (3 jours) → Reconstruction visuelle en Astro/Next.js (5–7 jours) → Validation en staging (3 jours) → Mise en production (1 jour). Le cycle complet peut être réalisé en seulement 2 semaines. Seuls deux points de contact sont nécessaires de votre côté : la réunion de lancement et la validation finale.",
    },
    {
      q: "Cela fonctionne-t-il avec notre agence ou notre équipe interne existante ?",
      a: "Absolument. Nous intervenons comme une couche de performance chirurgicale — nous ne remplaçons ni votre agence, ni votre CMS, ni votre équipe technique interne. Nous livrons une couche de présentation autonome qui s'intègre parfaitement à votre stack existante et fournissons des templates éditables sans code.",
    },
    {
      q: "Quelles sont les spécificités pour les PME françaises ?",
      a: "Notre offre prend en compte les exigences propres aux PME françaises : conformité RGPD, mentions légales obligatoires, accessibilité RGAA, intégration avec les solutions de paiement françaises, et SEO local pour le marché francophone. Nous vous aidons également à valoriser vos labels et certifications (Qualiopi, French Tech, etc.).",
    },
  ],
  reassurance: [
    "14 jours pour des résultats visibles — du lancement à la mise en ligne en 2 semaines",
    "Garantie de performance — remboursement intégral si le score Lighthouse 85+ n'est pas atteint",
    "Plus de 50 PME accompagnées — industrie, BTP, services, beauté et bien d'autres",
    "Déploiement sans interruption — vos systèmes restent en ligne pendant toute l'opération",
  ],
  offerBadges: [
    "Résultats rapides",
    "Éditable sans code",
    "Optimisé mobile",
    "Conforme RGPD",
    "Performance garantie",
  ],
  culturalNotes: {
    toneDescription:
      "Vouvoiement systématique ('vous' et non 'tu'). Français professionnel clair et concis, sans anglicismes superflus. Les décideurs français apprécient la rigueur et la transparence — privilégier les faits et chiffres précis au storytelling excessif. Utiliser les guillemets français (« ») et les espaces insécables selon les règles typographiques.",
    formalityLevel: "Vouvoiement (forme de politesse standard)",
    pronounPreference: "vous / votre (tutoiement exclu)",
  },
}
