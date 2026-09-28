import { CatalogHeader, Specimen, requireEntry } from '../specimen';
import { ShowPasswordDemo } from './demo';

export default function ShowPasswordSwitchCatalogPage(): React.ReactElement {
  const entry = requireEntry('show-password-switch');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Bajo el campo"
        description="Un interruptor con su texto, no un ojo dentro del campo. El del navegador se oculta para que no haya dos."
        usage={`<input type={passwordInputType(isVisible)} className={\`… \${PASSWORD_INPUT_CLASS}\`} />\n<ShowPasswordSwitch checked={isVisible} label="Mostrar contraseña" onChange={setIsVisible} />`}
      >
        <ShowPasswordDemo />
      </Specimen>
    </>
  );
}
