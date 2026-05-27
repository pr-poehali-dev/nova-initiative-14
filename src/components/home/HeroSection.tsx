import { Link } from "react-router-dom";

const ROBOT_SVG_MARKUP =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 612 612" preserveAspectRatio="xMidYMid meet" width="100%" height="100%">' +
  '<g transform="translate(0,612) scale(0.1,-0.1)" fill="currentColor" stroke="none">' +
  '<path d="M3926 5788 c-13 -20 -179 -438 -238 -599 l-21 -55 -129 -49 c-168 -62 -176 -74 -132 -189 6 -17 3 -18 -521 -186 -242 -78 -565 -182 -717 -231 -269 -87 -278 -90 -307 -74 -59 30 -162 47 -246 42 -230 -16 -414 -161 -491 -387 -28 -81 -25 -242 5 -330 44 -129 153 -255 271 -315 50 -26 153 -55 192 -55 20 0 29 -11 55 -72 17 -40 157 -355 311 -700 l280 -628 -21 -62 c-16 -51 -21 -89 -21 -193 0 -120 2 -136 30 -217 l31 -87 -62 -238 c-34 -131 -68 -257 -74 -280 l-11 -41 -163 -4 c-156 -3 -164 -4 -209 -31 -100 -58 -128 -129 -128 -317 0 -114 2 -130 21 -154 l20 -26 1230 0 1229 0 21 21 c20 20 21 29 17 177 -4 172 -13 206 -75 264 -59 56 -103 68 -269 68 l-151 0 -16 58 c-115 423 -130 495 -118 536 43 140 50 177 50 267 2 318 -204 589 -511 674 l-63 17 -190 276 c-353 512 -391 567 -466 674 -231 334 -213 302 -195 335 11 23 33 38 88 60 66 28 1000 437 1245 546 148 66 138 65 157 11 17 -51 39 -73 73 -74 12 0 77 20 144 45 l122 46 101 -52 c56 -28 194 -101 308 -160 113 -60 217 -109 230 -109 13 0 32 6 41 13 9 6 96 167 193 356 154 300 176 347 168 370 -6 16 -38 45 -81 75 -57 38 -77 47 -97 42 -17 -4 -74 -62 -167 -171 -77 -91 -143 -165 -145 -165 -3 0 -49 33 -102 74 l-97 74 -83 224 -84 224 22 111 c12 61 25 115 29 121 5 8 66 2 200 -18 107 -17 207 -30 223 -30 42 0 64 29 84 115 26 112 24 115 -156 185 -80 31 -238 94 -352 138 -114 45 -221 82 -238 82 -20 0 -34 -7 -44 -22z m379 -247 c138 -55 247 -100 244 -100 -9 -1 -341 48 -368 55 -13 3 -37 0 -52 -7 -31 -12 -36 -26 -64 -148 -7 -34 -15 -64 -17 -65 -8 -5 -202 -75 -204 -73 -1 1 37 102 84 225 78 199 89 222 107 218 11 -3 133 -50 270 -105z m-242 -578 c150 -394 155 -408 143 -415 -39 -23 -450 -168 -456 -161 -11 12 -210 546 -205 551 5 6 439 170 451 171 6 1 37 -65 67 -146z m-552 -344 c27 -68 48 -129 49 -136 0 -14 20 -5 -450 -210 -195 -85 -393 -172 -440 -193 -226 -101 -456 -200 -466 -200 -7 0 -13 29 -17 73 -7 99 -32 168 -94 259 -29 43 -49 79 -45 81 4 3 178 59 387 126 209 67 522 169 695 226 173 56 319 102 324 101 5 -1 31 -58 57 -127z m1249 -126 c-46 -87 -105 -199 -131 -2... [truncated]
  '<path d="M1592 4121 c-80 -21 -152 -99 -167 -183 -17 -89 44 -200 129 -239 143 -65 315 46 316 202 0 143 -140 254 -278 220z m97 -146 c49 -25 57 -90 16 -130 -40 -41 -105 -33 -130 16 -22 42 -18 67 14 100 33 32 58 36 100 14z"/>' +
  '<path d="M2792 1961 c-135 -47 -209 -192 -169 -332 57 -195 312 -256 454 -107 138 144 72 386 -121 443 -64 19 -99 18 -164 -4z m143 -135 c87 -37 101 -177 23 -228 -87 -56 -208 5 -208 105 0 101 91 162 185 123z"/>' +
  '</g></svg>';

const RobotArmDrawing = () => {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 w-full h-full p-4 pointer-events-none select-none text-[var(--drawing-line)] flex items-center justify-center"
      dangerouslySetInnerHTML={{ __html: ROBOT_SVG_MARKUP }}
    />
  );
};

const HeroSection = () => {
  return (
    <section className="pt-28 pb-16 px-4 md:px-8 max-w-[1200px] mx-auto">
      <div className="drawing-frame p-6 md:p-10 relative">
        <div className="zone-marker top-2 left-3">A1</div>
        <div className="zone-marker top-2 right-3">Зона I</div>
        <div className="zone-marker bottom-2 left-3">A2</div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10">
          <div className="md:col-span-7">
            <div className="font-gost text-[10px] uppercase tracking-[0.3em] text-[var(--drawing-line-thin)] mb-3">
              Наставничество по ВКР&nbsp;&middot; Раздел 01
            </div>
            <div className="extension-line-h w-full mb-6" />

            <h1 className="font-gost-upright text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.95] mb-6 text-[var(--drawing-line)] break-words">
              Доведём ваш
              <br />
              диплом до
              <br />
              <span className="text-[var(--drawing-accent)]">осознанной</span>
              <br />
              защиты
            </h1>

            <div className="extension-line-h w-3/4 my-5" />

            <p className="font-gost text-sm md:text-base max-w-lg text-[var(--drawing-line-thin)] leading-relaxed mb-8">
              Практикующие инженеры&#8209;конструкторы Екатеринбурга помогут разобраться в&nbsp;материале, закрыть замечания научрука и&nbsp;подготовиться к&nbsp;комиссии. Вы&nbsp;&mdash;&nbsp;автор. Мы&nbsp;&mdash;&nbsp;наставники.
            </p>

            <div className="flex flex-wrap gap-4 mb-4">
              <Link to="/contacts" className="btn-drawing btn-drawing-accent text-xs">
                Записаться на диагностику ВКР
              </Link>
              <Link to="/program" className="btn-drawing text-xs">
                Посмотреть программу&nbsp;&rarr;
              </Link>
            </div>
            <p className="font-gost text-[10px] text-[var(--drawing-line-thin)] opacity-70 max-w-md">
              Без обязательств. Разберём ваш план или черновик и&nbsp;подскажем следующие шаги.
            </p>
          </div>

          <div className="md:col-span-5 flex flex-col">
            <div className="w-full mb-3 border-l-2 border-[var(--drawing-accent)] pl-3">
              <p className="font-gost text-[10px] uppercase tracking-[0.15em] text-[var(--drawing-line-thin)] mb-1">
                Екатеринбург&nbsp;&middot; Машиностроение и&nbsp;механика
              </p>
              <p className="font-gost-upright text-2xl md:text-3xl font-bold tracking-tight leading-tight text-[var(--drawing-line)]">
                Инженеры обучают инженеров
              </p>
            </div>

            <div className="relative w-full flex-1 min-h-[360px] md:min-h-0 border-[2px] border-[var(--drawing-line)] hatching-blue overflow-hidden">
              <RobotArmDrawing />
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <table className="stamp-table">
            <tbody>
              <tr>
                <td className="thick-border" rowSpan={3}>Диплом-Инж.рф</td>
                <td>Лит.</td>
                <td>Масса</td>
                <td>Масштаб</td>
              </tr>
              <tr>
                <td>У</td>
                <td>&mdash;</td>
                <td>1:1</td>
              </tr>
              <tr>
                <td colSpan={3} className="text-[9px]">Наставничество по дипломному проекту</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;