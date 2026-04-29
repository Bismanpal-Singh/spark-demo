"use client"

import { useEffect, useMemo, useRef } from "react"
import { motion } from "framer-motion"

export type SparkRevealProfile = {
  name: string
  bio: string
  photos: string[]
}

export function SparkReveal({
  profile,
  onComplete,
}: {
  profile: SparkRevealProfile
  onComplete: () => void
}) {
  const hasPhoto = Boolean(profile.photos?.[0])
  const photoUrl = profile.photos?.[0]

  // The animation timing is intentionally deterministic and calm.
  const totalMs = 2700
  const calledRef = useRef(false)

  const backgroundTarget = useMemo(() => "var(--background)", [])

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (calledRef.current) return
      calledRef.current = true
      onComplete()
    }, totalMs)

    return () => window.clearTimeout(t)
  }, [onComplete])

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      initial={{ backgroundColor: "#0a0a0a" }}
      animate={{ backgroundColor: backgroundTarget }}
      transition={{
        // Step 2: transition after the pulse (we align this with the pulse end at ~800ms).
        duration: 0.4,
        delay: 0.8,
        ease: "easeInOut",
      }}
    >
      {/* Single minimal flame icon */}
      <motion.div
        className="flex items-center justify-center"
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      >
        <FlameIcon />
      </motion.div>

      {/* Revealed content */}
      <div className="mt-8 flex w-full flex-col items-center justify-center px-6 text-center">
        {/* Photo */}
        <motion.img
          src={hasPhoto ? photoUrl : undefined}
          alt={profile.name}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="max-h-[42vh] w-[320px] max-w-[90vw] rounded-[28px] object-cover shadow-2xl"
        />

        {/* Name: 150ms after photo appears */}
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.95 }}
          className="mt-4 text-[24px] font-medium leading-tight text-white"
        >
          {profile.name}
        </motion.h2>

        {/* Bio: 150ms after name appears */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35, delay: 1.1 }}
          className="mt-2 text-[14px] font-normal leading-snug text-[#888]"
        >
          {profile.bio}
        </motion.p>

        {/* Copy line: 300ms after bio appears */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, delay: 1.4 }}
          className="mt-4 text-[13px] font-medium uppercase tracking-[0.1em] text-[#F97316]"
        >
          Your spark is lit
        </motion.p>
      </div>
    </motion.div>
  )
}

function FlameIcon() {
  // Thin, elegant single teardrop flame shape.
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 2.5C9.9 6 6 10.1 6 14a6 6 0 0 0 12 0c0-3.9-3.9-8-6-11.5Z"
        stroke="#F97316"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

