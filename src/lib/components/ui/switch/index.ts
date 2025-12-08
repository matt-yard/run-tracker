import Root from './switch.svelte';
import type { Switch as SwitchPrimitive } from 'bits-ui';

type Props = SwitchPrimitive.Props & {
	checked?: boolean;
};

export {
	Root,
	type Props,
	//
	Root as Switch,
	type Props as SwitchProps
};
