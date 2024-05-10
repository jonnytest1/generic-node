import type { ExtendedJsonSchema } from '../typing/generic-node-type';


interface ValidationContext {
  path: Array<string>
  target: ExtendedJsonSchema,
  assigning: ExtendedJsonSchema,

  initialTarget?: ExtendedJsonSchema,
  initialAssigning?: ExtendedJsonSchema
}

export class SchemaMatchingError extends Error {


  constructor(public context: ValidationContext, message: string) {
    super(message)
    console.warn(message)
  }


  toMessageString() {
    return `${this.message} at /${this.context.path.join("/")}`
  }
}



export function validateJsonSchema(context: ValidationContext) {
  if (!context.initialAssigning) {
    context.initialAssigning = context.assigning
  }
  if (!context.initialTarget) {
    context.initialTarget = context.target
  }
  const target = context.target
  const assigning = context.assigning

  if (target.$ref || assigning.$ref) {
    debugger
  }

  if (!target.type || !assigning.type) {
    throw new SchemaMatchingError(context, "invalid schema type")
  }
  if (target.type !== assigning.type) {
    throw new SchemaMatchingError(context, `different schema Types ${target.type} and ${assigning.type}`)
  }
  if (target.type === "object") {
    const targetProps = target.properties ?? {}
    const assigningProps = assigning.properties ?? {}

    const requiredTargetProps = new Set(target.required ?? [])
    const requiredAssigningProps = new Set(assigning.required ?? [])
    for (const property in targetProps) {
      if (!(property in assigningProps)) {
        if (requiredTargetProps.has(property)) {
          throw new SchemaMatchingError(context, `property ${property} is missing`)
        }
      } else {
        validateJsonSchema({
          target: targetProps[property] as ExtendedJsonSchema,
          assigning: assigningProps[property] as ExtendedJsonSchema,
          path: [...context.path, property]
        })
      }


      if (requiredTargetProps.has(property)) {
        if (!requiredAssigningProps.has(property)) {
          throw new SchemaMatchingError(context, `property ${property} is required in target type but optional in assigning type`)
        }
      }

    }
  } else if (target.type === "number") {
    if (target.const) {
      debugger
    }
    if (target.enum) {
      debugger
    }
  } else if (target.type === "string") {
    if (target.const) {
      debugger
    }
    if (target.enum) {
      debugger
    }
    if (target.format) {
      debugger
    }
  } else {
    debugger
  }

}