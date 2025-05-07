import { NextResponse } from 'next/server'

export async function GET() { const rarities = ['Normal', 'Rare', 'Legend', 'Live', 'World'] const weights = [70, 20, 5, 3, 2] const names = { Normal: '김준성', Rare: '쏘니', Legend: '두 개의 심장', Live: '류상민', World: '차영진', } const images = { Normal: '/player1.png', Rare: '/player2.png', Legend: '/legend.png', Live: '/live.png', World: '/world.png', }

// 확률 계산 const rand = Math.random() * 100 let sum = 0 let rarity = 'Normal' for (let i = 0; i < rarities.length; i++) { sum += weights[i] if (rand < sum) { rarity = rarities[i] break } }

const card = { name: names[rarity], rarity, position: 'ST', image: images[rarity], }

return NextResponse.json(card) }

