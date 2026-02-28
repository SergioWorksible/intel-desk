declare module 'react-simple-maps' {
  import { ComponentType, ReactNode } from 'react'

  export interface Geography {
    rsmKey: string
    properties: Record<string, any>
  }

  export interface MarkerProps {
    coordinates: [number, number]
    children?: ReactNode
    [key: string]: any
  }

  export interface LineProps {
    coordinates: Array<[number, number]>
    [key: string]: any
  }

  export interface ComposableMapProps {
    projectionConfig?: {
      scale?: number
      center?: [number, number]
      [key: string]: any
    }
    width?: number
    height?: number
    children?: ReactNode
    [key: string]: any
  }

  export interface GeographiesProps {
    geography: string | object
    children?: (data: { geographies: Geography[] }) => ReactNode
    [key: string]: any
  }

  export interface GeographyProps {
    geography: Geography
    children?: (data: { geography: Geography }) => ReactNode
    [key: string]: any
  }

  export interface ZoomableGroupProps {
    children?: ReactNode
    [key: string]: any
  }

  export const ComposableMap: ComponentType<ComposableMapProps>
  export const Geographies: ComponentType<GeographiesProps>
  export const Geography: ComponentType<GeographyProps>
  export const Marker: ComponentType<MarkerProps>
  export const Line: ComponentType<LineProps>
  export const ZoomableGroup: ComponentType<ZoomableGroupProps>
}
