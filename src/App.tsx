/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { GameProvider } from './context/GameContext';
import { ScreenType } from './types/game';
import { MainMenu } from './components/MainMenu';
import { CraftingScreen } from './components/CraftingScreen';
import { DeckBuilder } from './components/DeckBuilder';
import { Battlefield } from './components/Battlefield';
import { RecipesGuide } from './components/RecipesGuide';
import { CharacterPortfolio } from './components/CharacterPortfolio';

function GameContent() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('menu');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-start">
      {currentScreen === 'menu' && (
        <MainMenu
          onStartGame={() => setCurrentScreen('game')}
          onGoToDeck={() => setCurrentScreen('deck')}
          onGoToCrafting={() => setCurrentScreen('crafting')}
          onGoToGuide={() => setCurrentScreen('guide')}
          onGoToPortfolio={() => setCurrentScreen('portfolio')}
        />
      )}

      {currentScreen === 'crafting' && (
        <CraftingScreen
          onBack={() => setCurrentScreen('menu')}
          onGoToDeck={() => setCurrentScreen('deck')}
          onGoToPortfolio={() => setCurrentScreen('portfolio')}
        />
      )}

      {currentScreen === 'deck' && (
        <DeckBuilder
          onBack={() => setCurrentScreen('menu')}
          onGoToCrafting={() => setCurrentScreen('crafting')}
          onStartGame={() => setCurrentScreen('game')}
        />
      )}

      {currentScreen === 'game' && (
        <Battlefield
          onBackToMenu={() => setCurrentScreen('menu')}
          onGoToCrafting={() => setCurrentScreen('crafting')}
        />
      )}

      {currentScreen === 'guide' && (
        <RecipesGuide
          onBack={() => setCurrentScreen('menu')}
          onGoToCrafting={() => setCurrentScreen('crafting')}
          onGoToPortfolio={() => setCurrentScreen('portfolio')}
        />
      )}

      {currentScreen === 'portfolio' && (
        <CharacterPortfolio
          onBack={() => setCurrentScreen('menu')}
          onGoToCrafting={() => setCurrentScreen('crafting')}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}
