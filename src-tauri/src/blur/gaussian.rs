use windows::{
    Foundation::{IPropertyValue, PropertyValue},
    Graphics::Effects::*,
    Win32::System::WinRT::Graphics::Direct2D::*,
    core::*,
};
#[implement(IGraphicsEffect, IGraphicsEffectSource, IGraphicsEffectD2D1Interop)]
pub struct Gaussian {
    pub source: IGraphicsEffectSource,
    pub amount: f32,
}
impl IGraphicsEffectSource_Impl for Gaussian_Impl {}
impl IGraphicsEffect_Impl for Gaussian_Impl {
    fn Name(&self) -> Result<HSTRING> {
        Ok("Gaussian".into())
    }
    fn SetName(&self, _: &HSTRING) -> Result<()> {
        Err(Error::from_hresult(HRESULT(0x80004001u32 as i32)))
    }
}
impl IGraphicsEffectD2D1Interop_Impl for Gaussian_Impl {
    fn GetEffectId(&self) -> Result<GUID> {
        Ok(GUID::from_u128(0x1feb6d69_2fe6_4ac9_8c58_1d7f93e7a6a5))
    }
    fn GetNamedPropertyMapping(
        &self,
        _: &PCWSTR,
        _: *mut u32,
        _: *mut GRAPHICS_EFFECT_PROPERTY_MAPPING,
    ) -> Result<()> {
        Err(Error::from_hresult(HRESULT(0x80070057u32 as i32)))
    }
    fn GetPropertyCount(&self) -> Result<u32> {
        Ok(3)
    }
    fn GetProperty(&self, index: u32) -> Result<IPropertyValue> {
        match index {
            0 => PropertyValue::CreateSingle(self.amount)?.cast(),
            1 | 2 => PropertyValue::CreateUInt32(1)?.cast(),
            _ => Err(Error::from_hresult(HRESULT(0x80070057u32 as i32))),
        }
    }
    fn GetSource(&self, index: u32) -> Result<IGraphicsEffectSource> {
        if index == 0 {
            Ok(self.source.clone())
        } else {
            Err(Error::from_hresult(HRESULT(0x80070057u32 as i32)))
        }
    }
    fn GetSourceCount(&self) -> Result<u32> {
        Ok(1)
    }
}
