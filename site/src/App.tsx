import { Route, Switch } from 'wouter';

import Clinique from './ecrans/Clinique';
import Dose from './ecrans/Dose';
import FichePharmacie from './ecrans/FichePharmacie';
import FicheQuart from './ecrans/FicheQuart';
import Horaire from './ecrans/Horaire';
import Menu from './ecrans/Menu';
import Repertoire from './ecrans/Repertoire';
import Statistiques from './ecrans/Statistiques';
import { Onglets } from './ui/Onglets';

/**
 * Le cadre : la barre d'onglets et la colonne de contenu. Sur un grand écran,
 * la barre passe à gauche ; sous 700 pixels, elle revient en bas, comme sur
 * le téléphone. Le contenu ne dépasse jamais 700 pixels de large.
 */
export default function App() {
  return (
    <div className="cadre">
      <Onglets />
      <main className="contenu">
        <Switch>
          <Route path="/" component={Horaire} />
          <Route path="/quart/:id" component={FicheQuart} />
          <Route path="/repertoire" component={Repertoire} />
          <Route path="/repertoire/:id" component={FichePharmacie} />
          <Route path="/clinique" component={Clinique} />
          <Route path="/clinique/dose" component={Dose} />
          <Route path="/statistiques" component={Statistiques} />
          <Route path="/menu" component={Menu} />
          <Route component={Horaire} />
        </Switch>
      </main>
    </div>
  );
}
