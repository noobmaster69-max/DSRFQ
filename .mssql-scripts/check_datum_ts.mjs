/**
 * The widget-side datum classifier, run for real.
 *
 * Emits one JSON line so check_datum_classifier.py can compare it against the
 * consumer's Python rules. Two implementations exist by necessity - one
 * classifies at insert, one classifies balloons that predate it - and they must
 * agree or a flag flips depending on which last looked at the balloon.
 */
import { isDatumSymbol }
    from '../DSRFQ.Web/Modules/Common/Widgets/BallooningWidget/BallooningDimensionFilter.ts';

const cases = JSON.parse(process.argv[2]);
console.log(JSON.stringify(cases.map(c => isDatumSymbol(c))));
