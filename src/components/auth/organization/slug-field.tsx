"use client"

import type { OrganizationAuthClient } from "@better-auth-ui/core/plugins/organization"
import { useAuth, useAuthPlugin } from "@better-auth-ui/react"
import { useCheckSlug } from "@better-auth-ui/react/plugins/organization"
import { useDebouncer } from "@tanstack/react-pacer"
import { Check, X } from "lucide-react"
import { useEffect, useState } from "react"

import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { organizationPlugin } from "@/lib/auth/organization-plugin"

/** Props for the `SlugField` component. */
export type SlugFieldProps = {
  value: string
  onChange: (value: string) => void
  currentSlug?: string
  disabled?: boolean
  id?: string
}

/**
 * Sanitize a slug value so it only contains lowercase alphanumeric characters
 * and dashes. Runs of disallowed characters are collapsed to a single dash, but
 * leading/trailing dashes are preserved while the user is still typing.
 */
export function sanitizeSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-")
}

/**
 * Organization slug field with debounced availability checking.
 */
export function SlugField({
  value,
  onChange,
  currentSlug,
  disabled,
  id = "slug"
}: SlugFieldProps) {
  const { authClient, localization: authLocalization } =
    useAuth<OrganizationAuthClient>()
  const {
    localization,
    checkSlug: checkSlugEnabled,
    slugPrefix
  } = useAuthPlugin(organizationPlugin)

  const [invalid, setInvalid] = useState<{ value: string; message: string }>()
  const slugError = invalid?.value === value ? invalid.message : undefined

  const {
    mutate: checkSlug,
    data: checkSlugData,
    error: checkSlugError,
    reset: resetCheckSlug
  } = useCheckSlug(authClient)

  const debouncer = useDebouncer(
    (next: string) => {
      if (!checkSlugEnabled || !next.trim() || next.trim() === currentSlug)
        return

      checkSlug({ slug: next.trim() })
    },
    { wait: 500 }
  )

  useEffect(() => {
    if (!checkSlugEnabled) return

    resetCheckSlug()
    debouncer.maybeExecute(value)
  }, [checkSlugEnabled, value, debouncer, resetCheckSlug])

  return (
    <Field data-invalid={!!slugError}>
      <FieldLabel htmlFor={id}>{localization.slug}</FieldLabel>

      <InputGroup>
        {slugPrefix && (
          <InputGroupAddon align="inline-start">{slugPrefix}</InputGroupAddon>
        )}

        <InputGroupInput
          id={id}
          name="slug"
          value={value}
          onChange={(e) => {
            onChange(sanitizeSlug(e.target.value))
          }}
          onInvalid={(e) => {
            e.preventDefault()
            setInvalid({ value, message: authLocalization.auth.fieldRequired })
          }}
          aria-invalid={!!slugError}
          placeholder={localization.slugPlaceholder}
          required
          disabled={disabled}
        />

        {checkSlugEnabled && !!value.trim() && value.trim() !== currentSlug && (
          <InputGroupAddon align="inline-end">
            {checkSlugData?.status ? (
              <Check className="size-4 text-foreground" />
            ) : checkSlugError ? (
              <X className="size-4 text-destructive" />
            ) : (
              <Spinner />
            )}
          </InputGroupAddon>
        )}
      </InputGroup>

      <FieldError>{slugError}</FieldError>
    </Field>
  )
}
