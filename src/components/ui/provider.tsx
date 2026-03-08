import { ChakraProvider } from '@chakra-ui/react'
import { IconContext } from '@phosphor-icons/react'
import { system } from '../../theme/system'

export function Provider({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider value={system}>
      <IconContext.Provider value={{ weight: 'fill' }}>
        {children}
      </IconContext.Provider>
    </ChakraProvider>
  )
}
