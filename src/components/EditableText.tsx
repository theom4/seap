import React, { useState, useRef } from 'react'

interface EditableTextProps {
    value: string
    onChange: (value: string) => void
    tagName?: keyof React.JSX.IntrinsicElements
    className?: string
    placeholder?: string
}

export const EditableText: React.FC<EditableTextProps> = ({
    value,
    onChange,
    tagName = 'span',
    className = '',
    placeholder = '',
}) => {
    const [isEditing, setIsEditing] = useState(false)
    const elementRef = useRef<HTMLElement>(null)

    const handleBlur = () => {
        setIsEditing(false)
        if (elementRef.current) {
            const newValue = elementRef.current.innerText
            if (newValue !== value) {
                onChange(newValue)
            }
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            elementRef.current?.blur()
        }
    }

    const Tag = tagName as any

    return (
        <Tag
            ref={elementRef}
            contentEditable
            suppressContentEditableWarning
            className={`${className} editable-text ${isEditing ? 'editing' : ''}`}
            onBlur={handleBlur}
            onFocus={() => setIsEditing(true)}
            onKeyDown={handleKeyDown}
            data-placeholder={placeholder}
        >
            {value}
        </Tag>
    )
}
