import React from "react"

export interface TitleProps {
    title: string
    subtitle?: string
}

export const PageTitle: React.FC<TitleProps> = ({title,subtitle}) => {

return (
          <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{title}</h1>
        {subtitle && <p className="text-sm text-gray-400 mt-1">
          {subtitle}
        </p> }
        
      </div>
)
}