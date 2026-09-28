import { CatalogHeader, Specimen, requireEntry } from '../specimen';
import { ResultDialogTriggers } from './result-dialog-triggers';

export default function ResultDialogCatalogPage(): React.ReactElement {
  const entry = requireEntry('result-dialog');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Los tres tonos"
        description="El foco entra en el botón de cierre; Escape y el fondo también cierran, y el foco vuelve al botón que lo abrió. Cambia el idioma arriba para ver los textos traducidos."
        usage={`const showResult = useResultDialog();\nshowResult(resultMessageFor(copy, 'userSuspend', name, outcome));`}
      >
        <ResultDialogTriggers />
      </Specimen>
    </>
  );
}
