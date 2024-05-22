type Characters = { [key: string]: { initial_label: string, name?: string, display_name?: string } }

class CharacterSheets {
    characters: Characters
    [key: string]: any;

    constructor(characters?: Characters) {
        this.characters = characters || { user: { initial_label: "user" }, bot: { initial_label: "少女" } }

        return new Proxy(this, {
            get(target, property) {
                if (property in target) {
                    return (target as any)[property];
                }
                if (property in target.characters) {
                    if (target.characters[property as string].name) {
                        target.characters[property as string]['display_name'] = target.characters[property as string].name
                    } else {
                        target.characters[property as string]['display_name'] = target.characters[property as string].initial_label
                    }

                    return target.characters[property as string]
                }
                return undefined;
            },
            set(target, property, value) {
                if (property in target) {
                    (target as any)[property] = value;
                } else {
                    target.characters[property as string] = value;
                }
                return true;
            }
        });
    }

    setName(key: string, value: string) {
        this.characters[key].name = value
    }

    * nonames(): IterableIterator<string> {
        for (const [key, value] of Object.entries(this.characters)) {
            if (!value.name) {
                yield key
            }
        }
    }

}

export default CharacterSheets