export class DirectusValidationModel {
    constructor(
        readonly errors: string[], //
        readonly warnings: string[],
    ) {}
}
