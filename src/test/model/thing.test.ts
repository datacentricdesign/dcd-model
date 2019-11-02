import { Thing, JSONThing } from '../../model/Thing';

describe('Test Thing', () => {
    const json: JSONThing = {
        name: 'Test Thing',
        description: 'A test of Thing.',
        type: 'Test',
    };

    it('Instantiate a thing from JSON.', function() {
        const thing = new Thing(json);
        console.log(thing.id);
        console.log(thing.description);
        console.log(thing.type);
    });

    it('Instantiate a thing from arguments.', function() {
        const thing = new Thing(json.name, json.description, json.type);
        console.log(thing.id);
        console.log(thing.description);
        console.log(thing.type);
    });
});
