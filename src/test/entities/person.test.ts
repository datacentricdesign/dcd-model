import { Person } from '../../entities/Person';

describe('Test Person', () => {
    const json = {
        id: 'test@datacentricdesign.org',
        name: 'Test Person',
        password: 'testtest',
        properties: [],
    };

    it('Instantiate a Person.', function() {
        const person = new Person(json);
    });
});
