import { useRef, useState, type ReactNode } from 'react';

import { libelleControle, VISIBLES } from '../lib/listes';
import { Icone } from './Icone';

/**
 * Une liste qui est une section dans un écran montre trois éléments, puis un
 * contrôle, à la même place dans les deux états. Replier ramène la vue sur
 * l'en-tête de la section : sinon on se retrouve au milieu de l'écran sans
 * savoir où.
 */
export function ListeRepliable<T>({
  elements,
  cle,
  rendre,
  enTete,
}: {
  elements: T[];
  cle: (element: T) => string | number;
  rendre: (element: T) => ReactNode;
  enTete?: ReactNode;
}) {
  const [ouvert, setOuvert] = useState(false);
  const ancre = useRef<HTMLDivElement>(null);
  const visibles = ouvert ? elements : elements.slice(0, VISIBLES);
  const repliable = elements.length > VISIBLES;

  return (
    <div className="liste-repliable" ref={ancre}>
      {enTete}
      <div className="section-corps">
        {visibles.map((e) => (
          <div key={cle(e)} className="section-ligne">
            {rendre(e)}
          </div>
        ))}
        {repliable && (
          <div className="section-ligne">
            <button
              type="button"
              className="controle-liste"
              aria-expanded={ouvert}
              onClick={() => {
                if (ouvert) ancre.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
                setOuvert(!ouvert);
              }}>
              <Icone nom={ouvert ? 'haut' : 'bas'} />
              <span>{libelleControle(elements.length, ouvert)}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
