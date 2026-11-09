import {gamepadDialogClasses,gamepadSliderClasses,findClassModule} from '@decky/ui';
import type {NativeFieldClasses,NativeColorClasses} from './nativeFields';
export const nativeSettingsFields=():NativeFieldClasses=>({field:gamepadDialogClasses?.Field,label:gamepadDialogClasses?.FieldLabel,description:gamepadDialogClasses?.FieldDescription,left:gamepadDialogClasses?.FieldLeftColumn,track:gamepadSliderClasses?.SliderTrack,handle:gamepadSliderClasses?.SliderHandle});
let colors:NativeColorClasses|undefined;
/** The calibration module may be lazy-loaded; resolve it on its own route. */
export function nativeColorClasses():NativeColorClasses|undefined {
 if(colors)return colors;
 try{const found=findClassModule(m=>typeof m.PageContainer==='string'&&typeof m.FloatingControls==='string'&&typeof m.PreviewImage==='string'&&typeof m.Section==='string') as Record<string,string>|undefined;
 if(found)colors={page:found.PageContainer,controls:found.FloatingControls,preview:found.PreviewImage,section:found.Section};}catch{/* Keep an unknown native page untouched. */}
 return colors;
}
