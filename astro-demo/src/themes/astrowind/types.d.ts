import type { HTMLAttributes, ImageMetadata } from 'astro/types'

export interface Image {
  src: string
  alt?: string
}

export interface Widget {
  id?: string
  isDark?: boolean
  bg?: string
  classes?: Record<string, string | Record<string, string>>
}

export interface Headline {
  title?: string
  subtitle?: string
  tagline?: string
  classes?: Record<string, string>
}

export interface Stat {
  amount?: number | string
  title?: string
  icon?: string
}

export interface Item {
  title?: string
  description?: string
  icon?: string
  classes?: Record<string, string>
  callToAction?: CallToAction
  image?: Image
}

export interface Price {
  title?: string
  subtitle?: string
  description?: string
  price?: number | string
  period?: string
  items?: Array<Item>
  callToAction?: CallToAction
  hasRibbon?: boolean
  ribbonTitle?: string
}

export interface Testimonial {
  title?: string
  testimonial?: string
  name?: string
  job?: string
  image?: string | unknown
}

export interface CallToAction extends Omit<HTMLAttributes<'a'>, 'slot'> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'link'
  text?: string
  icon?: string
  classes?: Record<string, string>
  type?: 'button' | 'submit' | 'reset'
}

export interface Hero extends Omit<Headline, 'classes'>, Omit<Widget, 'isDark' | 'classes'> {
  content?: string
  actions?: string | CallToAction[]
  image?: string | unknown
}

export interface Stats extends Omit<Headline, 'classes'>, Widget {
  stats?: Array<Stat>
}

export interface Pricing extends Omit<Headline, 'classes'>, Widget {
  prices?: Array<Price>
}

export interface Testimonials extends Omit<Headline, 'classes'>, Widget {
  testimonials?: Array<Testimonial>
  callToAction?: CallToAction
}

export interface Brands extends Omit<Headline, 'classes'>, Widget {
  icons?: Array<string>
  images?: Array<Image>
}

export interface Features extends Omit<Headline, 'classes'>, Widget {
  image?: string | unknown
  items?: Array<Item>
  columns?: number
  defaultIcon?: string
  isBeforeContent?: boolean
  isAfterContent?: boolean
}

export interface Faqs extends Omit<Headline, 'classes'>, Widget {
  items?: Array<Item>
  columns?: number
}

export interface Steps extends Omit<Headline, 'classes'>, Widget {
  items?: Array<Item>
  callToAction?: string | CallToAction
  image?: string | Image
  isReversed?: boolean
}

export interface Content extends Omit<Headline, 'classes'>, Widget {
  content?: string
  image?: string | unknown
  items?: Array<Item>
  columns?: number
  isReversed?: boolean
  isAfterContent?: boolean
  callToAction?: CallToAction
}

export interface Contact extends Omit<Headline, 'classes'>, Widget {
  inputs?: Array<{
    type: string
    name: string
    label?: string
    autocomplete?: string
    placeholder?: string
  }>
  textarea?: {
    label?: string
    name?: string
    placeholder?: string
    rows?: number
  }
  disclaimer?: { label?: string }
  button?: string
  description?: string
}
