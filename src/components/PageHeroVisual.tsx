import { FileCheck2, Globe2, Rocket } from "lucide-react"

/**
 * Small, evidence-shaped visual used by the shared page hero.
 * It explains a connected operating path without pretending to be a client case study.
 */
export default function PageHeroVisual() {
  return (
    <div className="page-hero-visual" aria-hidden="true">
      <div className="page-hero-visual__mesh" />
      <div className="page-hero-visual__orbit page-hero-visual__orbit--outer" />
      <div className="page-hero-visual__orbit page-hero-visual__orbit--inner" />
      <div className="page-hero-visual__beam page-hero-visual__beam--one" />
      <div className="page-hero-visual__beam page-hero-visual__beam--two" />
      <div className="page-hero-visual__node page-hero-visual__node--signal">
        <Globe2 size={17} strokeWidth={1.6} />
        <span>01</span>
      </div>
      <div className="page-hero-visual__node page-hero-visual__node--scope">
        <FileCheck2 size={17} strokeWidth={1.6} />
        <span>02</span>
      </div>
      <div className="page-hero-visual__node page-hero-visual__node--launch">
        <Rocket size={17} strokeWidth={1.6} />
        <span>03</span>
      </div>
      <div className="page-hero-visual__core">
        <span className="page-hero-visual__core-dot" />
        <span className="page-hero-visual__core-line" />
        <span className="page-hero-visual__core-line page-hero-visual__core-line--short" />
      </div>
    </div>
  )
}
