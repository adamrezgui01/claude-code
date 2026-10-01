import type { ReactNode } from 'react';

/** Un écran : son titre, puis son contenu. Le titre est en Title 1. */
export function Ecran({ titre, children }: { titre: string; children?: ReactNode }) {
  return (
    <section className="ecran">
      <h1 className="titre-ecran">{titre}</h1>
      {children}
    </section>
  );
}

/** Ce qu'on montre quand il n'y a rien : une phrase, sans illustration. */
export function Vide({ texte }: { texte: string }) {
  return <p className="vide">{texte}</p>;
}
