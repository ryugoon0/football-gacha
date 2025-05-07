'use client'

import { useState } from 'react'

const rarityColors: Record<string, string> = {
  Normal: 'bg-gray-300',
  Rare: 'bg-blue-400',
  Legend: 'bg-yellow-400',
  Live: 'bg-red-400',
  World: 'bg-green-400',
}

export default function GachaGame() {
  const [gold, setGold] = useState(1200)
  const [card, setCard] = useState<null | {
    name: string
    rarity: string
    position: string
  }>(null)

  const mockDraw = () => {
    if (gold < 100) {
      alert('Not enough gold')
      return
    }
    setGold(prev => prev - 100)
    const sampleCard = {
      name: 'Sun Hyen-man',
      rarity: 'Rare',
      position: 'ST',
    }
    setCard(sampleCard)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white text-black overflow-hidden">
      <div className="text-2xl font-bold mb-4">Gold: {gold}</div>
      <button
        onClick={mockDraw}
        className="bg-black text-white px-6 py-3 rounded-xl text-lg shadow hover:bg-gray-800"
      >
        Draw Card
      </button>
      {card && (
        <div
          className={`mt-6 w-60 p-4 rounded-xl shadow-lg text-center text-white ${
            rarityColors[card.rarity] || 'bg-gray-500'
          }`}
        >
          <div className="text-xl font-bold">{card.name}</div>
          <div className="text-sm">Position: {card.position}</div>
          <div className="text-md font-semibold">Rarity: {card.rarity}</div>
        </div>
      )}
    </div>
  )
}
