import logoFull from '../../assets/nimbasoft-logo.jpg'
import logoMark from '../../assets/nimbasoft-mark.png'

const MARK_SIZES = {
  sm: 'h-8 w-8 rounded-lg', // barre du haut (téléphone)
  md: 'h-10 w-10 rounded-xl', // barre latérale
  lg: 'h-14 w-14 rounded-2xl', // page de connexion (téléphone)
}

/** Symbole Nimbasoft seul (le losange) : pour les petits emplacements. */
export function LogoMark({ size = 'md', className = '' }: { size?: keyof typeof MARK_SIZES; className?: string }) {
  return (
    <img
      src={logoMark}
      alt="Nimbasoft"
      className={`shrink-0 object-cover shadow-sm ${MARK_SIZES[size]} ${className}`}
    />
  )
}

/** Logo complet (symbole + « Nimbasoft ») : pour les grands emplacements. */
export function LogoFull({ className = '' }: { className?: string }) {
  return <img src={logoFull} alt="Nimbasoft" className={`object-cover ${className}`} />
}
