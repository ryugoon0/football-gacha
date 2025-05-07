'use client'

import { useState } from 'react'
import Image from 'next/image'

const rarityColors: Record<string, string> = {
  Normal: 'bg-gray-300',
  Rare: 'bg-blue-400',
  Legend: 'bg-yellow-400',
  Live: 'bg-red-500',
  World: 'bg-green-500',
}

const rarityEffects: Record<string, string> = {
  Legend: 'animate-ping',
  Live: 'animate-bounce',
  World: 'animate-spin',
}

export default function GachaGame() {
  const [gold, setGold] = useState(1200)
  const [card, setCard] = useState<null | {
    name: string
    rarity: string
    position: string
    image: string
  }>(null)
  const [isSpinning, setIsSpinning] = useState(false)
  const [reelImage, setReelImage] = useState('/player1.png')

  const fetchCard = async () => {
    const res = await fetch('/api/gacha')
    const data = await res.json()
    return data
  }

  const mockDraw = async () => {
    if (gold < 100 || isSpinning) return

    setGold((prev) => prev - 100)
    setIsSpinning(true)

    let counter = 0
    const spin = setInterval(() => {
      counter++
      const randomIndex = Math.floor(Math.random() * 5)
      const randomImage = [`/player1.png`, `/player2.png`, `/legend.png`, `/live.png`, `/world.png`][randomIndex]
      setReelImage(randomImage)
    }, 100)

    const result = await fetchCard()

    setTimeout(() => {
      clearInterval(spin)
      setCard(result)
      setReelImage(result.image)
      setIsSpinning(false)
    }, 2000)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white text-black overflow-hidden">
      <div className="text-2xl font-bold mb-4">Gold: {gold}</div>
      <button
        onClick={mockDraw}
        className="bg-black text-white px-6 py-3 rounded-xl text-lg shadow hover:bg-gray-800 disabled:opacity-50"
        disabled={isSpinning}
      >
        Draw Card
      </button>

      {/* 애니메이션 이미지 */}
      <div className="h-40 w-40 mt-8 relative">
        <Image
          src={reelImage}
          alt="reel"
          fill
          className="object-contain animate-pulse"
        />
      </div>

      {card && !isSpinning && (
        <div
          className={`relative mt-6 w-60 p-4 rounded-xl shadow-lg text-center text-white ${
            rarityColors[card.rarity] || 'bg-gray-500'
          }`}
        >
          {['Legend', 'Live', 'World'].includes(card.rarity) && (
            <div
              className={`absolute inset-0 rounded-xl border-4 border-white pointer-events-none z-10 ${
                rarityEffects[card.rarity] || ''
              }`}
            />
          )}
          <Image
            src={card.image}
            alt={card.name}
            width={100}
            height={100}
            className="mx-auto mb-2 object-contain z-20"
          />
          <div className="text-xl font-bold z-20 relative">{card.name}</div>
          <div className="text-sm z-20 relative">Position: {card.position}</div>
          <div className="text-md font-semibold z-20 relative">Rarity: {card.rarity}</div>
        </div>
      )}
    </div>
  )
}
