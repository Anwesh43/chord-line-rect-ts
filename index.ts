const w : number = window.innerWidth 
const h : number = window.innerHeight
const parts : number = 5
const scGap : number = 0.02 / parts 
const strokeFactor : number = 90 
const sizeFactor : number = 8.3 
const deg : number = Math.PI / 4 
const backColor : string = "#BDBDBD"
const colors : Array<string> = [
    "#F44336",
    "#673AB7",
    "#4CAF50",
    "#03A9F4",
    "#009688"
] 
const delay : number = 20 
const rot : number = Math.PI / 2

class ScaleUtil {

    static maxScale(scale : number, i : number, n : number) : number {
        return Math.max(0, scale - i / n)
    }

    static divideScale(scale : number, i : number, n : number) : number {
        return Math.min(1 / n, ScaleUtil.maxScale(scale, i, n)) * n 
    }

    static sinify(scale : number) : number {
        return Math.sin(scale * Math.PI)
    }
}

class DrawingUtil {

    static drawLine(context : CanvasRenderingContext2D, x1 : number, y1 : number, x2 : number, y2 : number) {
        context.beginPath()
        context.moveTo(x1, y1)
        context.lineTo(x2, y2)
        context.stroke()
    }

    static drawCircle(context : CanvasRenderingContext2D, x : number, y : number, r : number) {
        context.beginPath()
        context.arc(x, y, r, 0, 2 * Math.PI)
        context.stroke()
    }

    static drawClippedRect(context : CanvasRenderingContext2D, r : number, scale : number) {
        const sf : number = ScaleUtil.sinify(scale)
        const sf1 : number = ScaleUtil.divideScale(sf, 0, parts)
        const sf2 : number = ScaleUtil.divideScale(sf, 1, parts)
        const sf3 : number = ScaleUtil.divideScale(sf, 2, parts)
        const sf4 : number = ScaleUtil.divideScale(sf, 3, parts)
        const x : number = -r * Math.cos(deg)
        const y : number = r * Math.sin(deg)
        const x1 : number = r * Math.cos(deg)
        if (scale < scGap) {
            return
        }
        context.save()
        context.translate(w / 2, h / 2)
        context.rotate(rot * sf4)
        context.beginPath()
        context.arc(0, 0, r * sf1, 0, 2 * Math.PI)
        context.stroke()
        context.clip()
        if (sf2 >= 0.1) {
            DrawingUtil.drawLine(context, x, y, x + (x1 - x) * sf2, y)
        }
        context.fillRect(x, y, (x1 - x) * sf3, r - y)
        context.restore()
    }

    static drawCLRNode(context : CanvasRenderingContext2D, i : number, scale : number) {
        const r : number = Math.min(w, h) / sizeFactor 
        context.lineCap = 'round'
        context.lineWidth = Math.min(w, h) / strokeFactor 
        context.fillStyle = colors[i]
        context.strokeStyle = colors[i]
        DrawingUtil.drawClippedRect(context, r, scale) 
    }
}

class Stage {

    canvas : HTMLCanvasElement = document.createElement('canvas')
    context : CanvasRenderingContext2D 
    renderer : Renderer = new Renderer()

    initCanvas() {
        this.canvas.width = w 
        this.canvas.height = h 
        this.context = this.canvas.getContext('2d')
        document.body.appendChild(this.canvas)
    }

    render() {
        this.context.fillStyle = backColor 
        this.context.fillRect(0, 0, w, h)
        this.renderer.render(this.context)
    }

    handleTap() {
        this.canvas.onmousedown = () => {
            this.renderer.handleTap(() => {
                this.render()
            })
        }
    }

    static init() {
        const stage : Stage = new Stage()
        stage.initCanvas()
        stage.render()
        stage.handleTap()
    }
}

class State {

    scale : number = 0 
    dir : number = 0 
    prevScale : number = 0 

    update(cb : Function) {
        this.scale += scGap * this.dir 
        if (Math.abs(this.scale - this.prevScale) > 1) {
            this.scale = this.prevScale + this.dir 
            this.dir = 0 
            this.prevScale = this.scale 
            cb()
        } 
    }

    startUpdating(cb : Function) {
        if (this.dir == 0) {
            this.dir = 1 - 2 * this.prevScale 
            cb()
        }
    }
}

class Animator {

    animated : boolean = false 
    interval : number 

    start(cb : Function) {
        if (!this.animated) {
            this.animated = true 
            this.interval = setInterval(cb, delay)
        }
    }

    stop() {
        if (this.animated) {
            this.animated = false 
            clearInterval(this.interval)
        }
    }
}

class CLRNode {

    prev : CLRNode 
    next : CLRNode 
    state : State = new State()

    constructor(private i : number) {
        this.addNeighbor()
    }
    
    addNeighbor() {
        if (this.i < colors.length - 1) {
            this.next = new CLRNode(this.i + 1)
            this.next.prev = this 
        }
    }

    draw(context : CanvasRenderingContext2D) {
        DrawingUtil.drawCLRNode(context, this.i, this.state.scale)
    }

    update(cb : Function) {
        this.state.update(cb)
    }

    startUpdating(cb : Function) {
        this.state.startUpdating(cb)
    }

    getNext(dir : number, cb : Function) : CLRNode {
        var curr : CLRNode = this.prev 
        if (dir == 1) {
            curr = this.next 
        }
        if (curr) {
            return curr 
        }
        cb()
        return this 
    }
}

class ChordLineRect {

    curr : CLRNode = new CLRNode(0)
    dir : number = 1 

    draw(context : CanvasRenderingContext2D) {
        this.curr.draw(context)    
    }

    update(cb : Function) {
        this.curr.update(() => {
            this.curr = this.curr.getNext(this.dir, () => {
                this.dir *= -1
            })
            cb()
        })
    }

    startUpdating(cb : Function) {
        this.curr.startUpdating(cb)
    }
}

class Renderer {

    clr : ChordLineRect = new ChordLineRect()
    animator : Animator = new Animator()

    render(context : CanvasRenderingContext2D) {
        this.clr.draw(context)
    }

    handleTap(cb : Function) {
        this.clr.startUpdating(() => {
            this.animator.start(() => {
                cb()
                this.clr.update(() => {
                    this.animator.stop()
                    cb()
                })
            })
        })
    }
}
