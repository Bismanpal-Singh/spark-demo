"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"

export type SparkRevealProfile = {
  name: string
  bio: string
  photos: string[]
}

export function SparkReveal({
  currentUserName,
  matchedProfile,
  onComplete,
}: {
  currentUserName: string
  matchedProfile: SparkRevealProfile
  onComplete: () => void
}) {
  const [photoFailed, setPhotoFailed] = useState(false)
  const hasPhoto = Boolean(matchedProfile.photos?.[0]) && !photoFailed
  const photoUrl = matchedProfile.photos?.[0]
  const calledRef = useRef(false)

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (calledRef.current) return
      calledRef.current = true
      onComplete()
    }, 3000)
    return () => window.clearTimeout(t)
  }, [onComplete])

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      initial={{ backgroundColor: "#080808" }}
      animate={{ backgroundColor: "var(--background)" }}
      transition={{ duration: 0.6, delay: 1.4, ease: "easeInOut" }}
    >
      <div className="mx-auto flex w-full max-w-[380px] flex-col items-center px-6 text-center">

        {/* Flame */}
        <motion.svg
          width="20"
          height="24"
          viewBox="0 0 20 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <path
            d="M10 0C10 0 10 6 6 9C2 12 2 15 2 17C2 20.866 5.582 24 10 24C14.418 24 18 20.866 18 17C18 15 18 12 14 9C10 6 10 0 10 0Z"
            fill="#fb923c"
            opacity="0.9"
          />
          <path
            d="M10 10C10 10 10 13.5 8 15C6 16.5 6 18 6 18.5C6 20.433 7.79 22 10 22C12.21 22 14 20.433 14 18.5C14 18 14 16.5 12 15C10 13.5 10 10 10 10Z"
            fill="#fed7aa"
            opacity="0.6"
          />
        </motion.svg>

        {/* Both names */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3, ease: "easeInOut" }}
          className="mt-4 flex items-center gap-2"
        >
          <span className="text-[15px] font-medium text-white">
            {currentUserName}
          </span>
          <span className="text-[11px] text-amber-400" style={{ letterSpacing: "0.04em" }}>
            &amp;
          </span>
          <span className="text-[15px] font-medium text-white">
            {matchedProfile.name}
          </span>
        </motion.div>

        {/* Label */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5, ease: "easeInOut" }}
          className="mt-1 text-[11px] font-medium text-amber-400"
          style={{ letterSpacing: "0.04em" }}
        >
          it's a spark
        </motion.p>

        {/* Photo */}
        {hasPhoto && (
          <motion.img
            src={photoUrl}
            alt={matchedProfile.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.9, ease: "easeInOut" }}
            className="mt-7 max-h-[42vh] w-full rounded-[24px] object-cover shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
            onError={() => setPhotoFailed(true)}
          />
        )}

        {/* One clean line only (avoid repeating profile name/bio here). */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: hasPhoto ? 1.2 : 0.9, ease: "easeInOut" }}
          className="mt-4 text-[14px] leading-relaxed text-white/55"
        >
          Conversation unlocked. Say hi and keep the spark going.
        </motion.p>

      </div>
    </motion.div>
  )
}