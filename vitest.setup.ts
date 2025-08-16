import { expect } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)

declare global {
  var IS_DEV: boolean
}

global.IS_DEV = true