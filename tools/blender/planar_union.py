"""Dependency-free convex 2D subtraction for coplanar road surface blockouts.

Each road rectangle is split against all earlier rectangles. The resulting surface
polygons do not overlap, so same-height asphalt cannot Z-fight at junctions.
"""
import math


def area(points):
    return abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in
                   zip(points,points[1:]+points[:1])))/2


def box_outline(spec):
    x,y=spec['position'][:2]
    sx,sy=spec['size'][:2]
    a=math.radians(spec['rotation'][2]);c,s=math.cos(a),math.sin(a)
    return [(x+u*c-v*s,y+u*s+v*c) for u,v in
            [(-sx/2,-sy/2),(sx/2,-sy/2),(sx/2,sy/2),(-sx/2,sy/2)]]


def halfplane(poly,a,b,inside=True):
    if not poly:return []
    def side(p):return (b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0])
    result=[]
    previous=poly[-1]; old=side(previous)
    for current in poly:
        new=side(current)
        previous_ok=old>=-1e-8 if inside else old<=1e-8
        current_ok=new>=-1e-8 if inside else new<=1e-8
        if current_ok!=previous_ok:
            t=old/(old-new)
            result.append((previous[0]+t*(current[0]-previous[0]),
                           previous[1]+t*(current[1]-previous[1])))
        if current_ok:result.append(current)
        previous,old=current,new
    return result


def difference_convex(subject, clip):
    """Return non-overlapping convex pieces of subject outside CCW clip polygon."""
    remaining=subject
    output=[]
    for a,b in zip(clip,clip[1:]+clip[:1]):
        outside=halfplane(remaining,a,b,inside=False)
        if len(outside)>=3 and area(outside)>.01:output.append(outside)
        remaining=halfplane(remaining,a,b,inside=True)
        if len(remaining)<3 or area(remaining)<.01:break
    return output


def subtract_previous(subject, previous):
    pieces=[subject]
    for clip in previous:
        pieces=[fragment for piece in pieces for fragment in difference_convex(piece,clip)]
        if not pieces:break
    return pieces
