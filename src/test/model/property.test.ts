import { JSONProperty, Property } from '../../model/Property';
import { Class } from '../../model/Class';
import {Dimension} from "../../model/Dimension";

describe('Test Property', () => {
    const json: JSONProperty = {
        name: 'Test Property',
        description: 'A test of Property.',
        type: 'ACCELEROMETER',
    };

    it('Instantiate a Property.', function() {
        const property = new Property(json);

        it('Instantiate a Class.', function() {
            const clazz = new Class('Test Class', 0, property);
        });

        it('Instantiate a Dimension.', function() {
            const dimension = new Dimension('Test dimension', 'A test of dimension', '');
        });
    });
});
