use super::BlurRect;
use windows::{
    Graphics::{IGeometrySource2D, IGeometrySource2D_Impl},
    UI::Composition::CompositionPath,
    Win32::{
        Graphics::Direct2D::{
            Common::{D2D_SIZE_F, D2D1_FIGURE_BEGIN_FILLED, D2D1_FIGURE_END_CLOSED},
            D2D1_ARC_SEGMENT, D2D1_ARC_SIZE_SMALL, D2D1_FACTORY_TYPE_MULTI_THREADED,
            D2D1_SWEEP_DIRECTION_CLOCKWISE, D2D1_SWEEP_DIRECTION_COUNTER_CLOCKWISE,
            D2D1CreateFactory, ID2D1Factory, ID2D1Geometry, ID2D1GeometrySink,
        },
        System::WinRT::Graphics::Direct2D::{
            IGeometrySource2DInterop, IGeometrySource2DInterop_Impl,
        },
    },
    core::{Interface, Ref, Result, implement},
};
use windows_numerics::Vector2;

#[derive(Clone, Copy, PartialEq)]
pub(super) struct BackdropShape {
    width: f32,
    pub height: f32,
    radius_x: f32,
    radius_y: f32,
    rounded_top: bool,
    pub ear_width: f32,
    ear_height: f32,
}

impl BackdropShape {
    pub fn from_rect(rect: &BlurRect, scale: f64) -> Self {
        let width = (rect.width * scale).round().max(1.0) as f32;
        let height = (rect.height * scale).round().max(1.0) as f32;
        let (ear_width, ear_height) = if rect.rounded_top {
            (0.0, 0.0)
        } else {
            (
                (rect.ear_width * scale).round().max(0.0) as f32,
                ((rect.ear_height * scale) as f32).clamp(0.0, height),
            )
        };
        let height_limit = if rect.rounded_top {
            height / 2.0
        } else {
            height - ear_height
        };
        let mut radius_x = ((rect.radius_x * scale) as f32).max(0.0);
        let mut radius_y = ((rect.radius_y * scale) as f32).max(0.0);
        // CSS scales both axes by the same factor when adjacent corners would overlap.
        if radius_x > width / 2.0 || radius_y > height_limit {
            let factor = (width / (2.0 * radius_x)).min(height_limit / radius_y);
            radius_x *= factor;
            radius_y *= factor;
        }
        Self {
            width,
            height,
            radius_x,
            radius_y,
            rounded_top: rect.rounded_top,
            ear_width,
            ear_height,
        }
    }

    pub fn total_width(self) -> f32 {
        self.width + self.ear_width * 2.0
    }

    pub fn composition_path(self, factory: &ID2D1Factory) -> Result<CompositionPath> {
        let source: IGeometrySource2D = GeometrySource {
            shape: self,
            geometry: self.build(factory)?,
        }
        .into();
        CompositionPath::Create(&source)
    }

    fn build(self, factory: &ID2D1Factory) -> Result<ID2D1Geometry> {
        let left = self.ear_width;
        let right = left + self.width;
        let h = self.height;
        let rx = self.radius_x;
        let ry = self.radius_y;
        let (tx, ty) = if self.rounded_top {
            (rx, ry)
        } else {
            (0.0, 0.0)
        };
        let point = |x, y| Vector2 { X: x, Y: y };
        unsafe {
            let path = factory.CreatePathGeometry()?;
            let sink = path.Open()?;
            sink.BeginFigure(point(tx, 0.0), D2D1_FIGURE_BEGIN_FILLED);
            sink.AddLine(point(self.total_width() - tx, 0.0));
            // The CSS tint follows the same quarter ellipses at the top edge.
            if left > 0.0 {
                arc(
                    &sink,
                    point(right, self.ear_height),
                    left,
                    self.ear_height,
                    true,
                );
            } else {
                arc(&sink, point(right, ty), tx, ty, false);
            }
            sink.AddLine(point(right, h - ry));
            arc(&sink, point(right - rx, h), rx, ry, false);
            sink.AddLine(point(left + rx, h));
            arc(&sink, point(left, h - ry), rx, ry, false);
            if left > 0.0 {
                sink.AddLine(point(left, self.ear_height));
                arc(&sink, point(0.0, 0.0), left, self.ear_height, true);
            } else {
                sink.AddLine(point(0.0, ty));
                arc(&sink, point(tx, 0.0), tx, ty, false);
            }
            sink.EndFigure(D2D1_FIGURE_END_CLOSED);
            sink.Close()?;
            path.cast()
        }
    }
}

pub(super) fn create_factory() -> Result<ID2D1Factory> {
    // The compositor may retrieve the geometry from a different thread.
    unsafe { D2D1CreateFactory(D2D1_FACTORY_TYPE_MULTI_THREADED, None) }
}

fn arc(sink: &ID2D1GeometrySink, point: Vector2, width: f32, height: f32, concave: bool) {
    unsafe {
        if width == 0.0 || height == 0.0 {
            sink.AddLine(point);
            return;
        }
        sink.AddArc(&D2D1_ARC_SEGMENT {
            point,
            size: D2D_SIZE_F { width, height },
            rotationAngle: 0.0,
            sweepDirection: if concave {
                D2D1_SWEEP_DIRECTION_COUNTER_CLOCKWISE
            } else {
                D2D1_SWEEP_DIRECTION_CLOCKWISE
            },
            arcSize: D2D1_ARC_SIZE_SMALL,
        });
    }
}

#[implement(IGeometrySource2D, IGeometrySource2DInterop)]
struct GeometrySource {
    shape: BackdropShape,
    geometry: ID2D1Geometry,
}

impl IGeometrySource2D_Impl for GeometrySource_Impl {}

impl IGeometrySource2DInterop_Impl for GeometrySource_Impl {
    fn GetGeometry(&self) -> Result<ID2D1Geometry> {
        Ok(self.geometry.clone())
    }

    fn TryGetGeometryUsingFactory(&self, factory: Ref<ID2D1Factory>) -> Result<ID2D1Geometry> {
        self.shape.build(factory.ok()?)
    }
}
