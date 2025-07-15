'use client'

import React from 'react'

export default function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  return (
    <>
      {children}
    </>
  )
}
