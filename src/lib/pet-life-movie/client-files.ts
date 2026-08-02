export const PET_MOVIE_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const
export const PET_MOVIE_MAX_FILE_BYTES = 20 * 1024 * 1024
export const PET_MOVIE_MAX_FILES = 20
export const PET_MOVIE_MIN_FILES = 5

export interface PetMovieClientFile {
  name: string
  type: string
  size: number
}

export function validatePetMovieFiles(files: PetMovieClientFile[], minimum = PET_MOVIE_MIN_FILES, maximum = PET_MOVIE_MAX_FILES): string | null {
  if (files.length < minimum) return `Select at least ${minimum} photos.`
  if (files.length > maximum) return `Select no more than ${maximum} photos.`
  const unsupported = files.find((file) => !PET_MOVIE_FILE_TYPES.includes(file.type as (typeof PET_MOVIE_FILE_TYPES)[number]))
  if (unsupported) return `${unsupported.name} is not a supported JPEG, PNG, WebP, HEIC, or HEIF image.`
  const oversized = files.find((file) => file.size <= 0 || file.size > PET_MOVIE_MAX_FILE_BYTES)
  if (oversized) return `${oversized.name} must be between 1 byte and 20 MB.`
  return null
}
