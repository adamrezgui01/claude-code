import { useState } from 'react';

/**
 * L'instant qui sert à dire si un quart est fini, lu une fois à l'ouverture
 * de l'écran. Relu à chaque rendu, il ferait changer un état sous le doigt
 * sans que rien d'autre ne bouge.
 */
export function useMaintenant(): Date {
  const [maintenant] = useState(() => new Date());
  return maintenant;
}
